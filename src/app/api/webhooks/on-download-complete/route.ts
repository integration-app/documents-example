import { z } from "zod";
import connectDB from "@/lib/mongodb";
import {
  deleteFileFromS3,
  getS3ObjectStream,
  processAndUploadFileToS3,
} from "@/lib/s3-utils";
import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  isSupportedFile,
  Unstructured,
  UnstructuredIsEnabled,
} from "./text-extraction-utils";
import { inngest } from "@/inngest/client";
import { NonRetriableError } from "inngest";

const onDownloadCompleteWebhookPayloadSchema = z.object({
  downloadURI: z
    .union([
      z.string().url().min(1),
      z
        .string()
        .length(0)
        .transform(() => undefined),
    ])
    .optional(),
  documentId: z.string(),
  text: z.string().optional(),
  connectionId: z.string(),
});

interface DownloadEventData {
  downloadURI: string;
  documentId: string;
  connectionId: string;
  title: string;
  currentStorageKey?: string;
}

interface DocumentType {
  id: string;
  connectionId: string;
  title: string;
  storageKey?: string;
  content?: string;
  isDownloading: boolean;
  isExtractingText: boolean;
  lastSyncedAt: string;
}

/**
 * This endpoint is called when a download flow for a document is complete
 *
 * - We want to update the document with new content if provided
 * - When new resourceURI is provided, we want to download the file into our own storage
 *   and update the document with the new downloadURI
 */

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json();

    const validationResult =
      onDownloadCompleteWebhookPayloadSchema.safeParse(rawPayload);

    if (!validationResult.success) {
      console.error("Invalid webhook payload:", validationResult.error);
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const payload = validationResult.data;
    const { downloadURI, documentId, text, connectionId } = payload;

    await connectDB();

    const document = await DocumentModel.findOne({
      connectionId,
      id: documentId,
    });

    if (!document) {
      console.error(`Document with id ${documentId} not found`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (text) {
      const updateData = {
        content: text,
      };

      await DocumentModel.findOneAndUpdate(
        { connectionId, id: documentId },
        {
          $set: {
            lastSyncedAt: new Date().toISOString(),
            ...updateData,
          },
        },
        { new: true }
      );
    } else if (downloadURI) {
      await inngest.send({
        name: "document/download-and-extract-text-from-file",
        data: {
          downloadURI,
          documentId,
          connectionId,
          title: document.title,
          currentStorageKey: document.storageKey,
        },
      });
    }

    await DocumentModel.findOneAndUpdate(
      { connectionId, id: documentId },
      {
        $set: {
          isDownloading: false,
        },
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to process webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const TEXT_EXTRACTION_TIMEOUT = 3 * 60 * 1000; // 5 minutes

export const inngest_downloadAndExtractTextFromFile = inngest.createFunction(
  { id: "download-and-extract-text-from-file" },
  { event: "document/download-and-extract-text-from-file" },
  async ({ event, step, logger }) => {
    const { downloadURI, documentId, connectionId, title, currentStorageKey } =
      event.data as DownloadEventData;

    // Step 1: Verify document exists
    await step.run("verify-document", async () => {
      const document = await DocumentModel.findOne({
        connectionId,
        id: documentId,
      });
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      return document;
    });

    // Step 2: Download and upload file to S3
    const { newStorageKey } = await step.run(
      "process-and-upload-file",
      async () => {
        const { keyWithExtension } = await processAndUploadFileToS3(
          downloadURI,
          `${connectionId}/${documentId}/${uuidv4()}/${title}`
        );

        return {
          newStorageKey: keyWithExtension,
        };
      }
    );

    // Step 3: Clean up old S3 file if needed
    if (currentStorageKey) {
      await step.run("cleanup-old-file", async () => {
        await deleteFileFromS3(currentStorageKey);
        logger.info(`Deleted old file from S3: ${currentStorageKey}`);
      });
    }

    // Step 4: Update document with new storage key
    const updatedDoc = await step.run("update-document-storage", async () => {
      const doc = await DocumentModel.findOneAndUpdate(
        { connectionId, id: documentId },
        {
          $set: {
            isDownloading: false,
            lastSyncedAt: new Date().toISOString(),
            storageKey: newStorageKey,
          },
        },
        { new: true }
      ).lean();

      if (!doc) {
        throw new Error("Failed to update document");
      }

      return doc as DocumentType;
    });

    // Step 5: Extract text if possible
    const shouldExtractText =
      Unstructured.hasUnstructuredCredentials &&
      updatedDoc.storageKey &&
      UnstructuredIsEnabled &&
      isSupportedFile(updatedDoc.title);

    if (shouldExtractText) {
      // Step 5a: Mark document as processing
      await step.run("mark-text-extraction-start", async () => {
        const updatedDoc = await DocumentModel.updateOne(
          { connectionId, id: documentId },
          { $set: { isExtractingText: true } }
        );

        return updatedDoc;
      });

      // Step 5b: Extract text content
      const extractedText = await step.run("extract-text", async () => {
        const { Body } = await getS3ObjectStream(newStorageKey);

        if (!Body) {
          throw new Error("Failed to get file content from S3");
        }

        logger.info(`Got file content from S3: ${updatedDoc.title}`);
        const chunks: Buffer[] = [];
        for await (const chunk of Body as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        logger.info(`Sending file to Unstructured: ${updatedDoc.title}`);

        // Create a timeout promise
        const timeout = new Promise<string>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Text extraction timed out"));
          }, TEXT_EXTRACTION_TIMEOUT);
        });

        try {
          // Race between the text extraction and timeout
          const text = await Promise.race([
            Unstructured.extractTextFromFile({
              fileName: updatedDoc.title,
              content: fileBuffer,
            }),
            timeout,
          ]);

          logger.info(`Unstructured extracted text successfully`);
          return text;
        } catch (error: unknown) {
          logger.error(
            `Text extraction failed or timed out: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          // Update document to remove processing state
          await DocumentModel.updateOne(
            { connectionId, id: documentId },
            { $set: { isExtractingText: false } }
          );

          return "";
        }
      });

      // Step 5c: Update document with extracted text
      if (extractedText) {
        await step.run("save-extracted-text", async () => {
          await DocumentModel.updateOne(
            { connectionId, id: documentId },
            {
              $set: {
                content: extractedText,
                isExtractingText: false,
              },
            }
          );
        });
      }
    }

    return { success: true };
  }
);
