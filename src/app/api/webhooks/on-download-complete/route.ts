import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { deleteFileFromS3, processAndUploadFileToS3 } from "@/lib/s3-utils";
import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  isSupportedFile,
  Unstructured,
  UnstructuredIsEnabled,
} from "./text-extraction-utils";
import { inngest } from "@/inngest/client";

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

export const inngest_downloadAndExtractTextFromFile = inngest.createFunction(
  { id: "download-and-extract-text-from-file" },
  { event: "document/download-and-extract-text-from-file" },
  async ({ event, logger }) => {
    const { downloadURI, documentId, connectionId, title } =
      event.data as DownloadEventData;

    let buffer: Buffer | undefined;
    let newStorageKey: string | undefined;

    try {
      logger.info("FETCHING FILE FROM INTEGRATION AND UPLOADING TO S3");
      const { keyWithExtension, buffer: _buffer } =
        await processAndUploadFileToS3(
          downloadURI,
          `${connectionId}/${documentId}/${uuidv4()}/${title}`
        );
      logger.info(`FILE UPLOADED TO S3: ${keyWithExtension}`);

      newStorageKey = keyWithExtension;
      buffer = _buffer;
    } catch (error) { 
      console.error("Failed to process file:", error);
      throw new Error("Failed to process file");
    }

    const existingDocument = await DocumentModel.findOne({
      connectionId,
      id: documentId,
    });
    if (!existingDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    if (newStorageKey && existingDocument.storageKey) {
      logger.info(`DELETING OLD FILE FROM S3: ${existingDocument.storageKey}`);
      await deleteFileFromS3(existingDocument.storageKey);
    }

    const updateData = newStorageKey ? { storageKey: newStorageKey } : {};
    const documentAfterDownloadStatusIsUpdated =
      await DocumentModel.findOneAndUpdate(
        { connectionId, id: documentId },
        {
          $set: {
            isDownloading: false,
            lastSyncedAt: new Date().toISOString(),
            ...updateData,
          },
        },
        { new: true }
      );

    if (
      Unstructured.hasUnstructuredCredentials &&
      documentAfterDownloadStatusIsUpdated?.storageKey &&
      UnstructuredIsEnabled &&
      buffer
    ) {
      const _isSupportedFile = isSupportedFile(
        documentAfterDownloadStatusIsUpdated.title
      );

      if (_isSupportedFile) {
        logger.info("EXTRACTING TEXT FROM FILE");

        await DocumentModel.updateOne(
          { connectionId, id: documentId },
          {
            $set: { isExtractingText: true },
          }
        );

        const text = await Unstructured.extractTextFromFile({
          fileName: documentAfterDownloadStatusIsUpdated.title,
          content: buffer,
        });

        logger.info("UPDATING DOCUMENT WITH EXTRACTED TEXT");

        await DocumentModel.updateOne(
          { connectionId, id: documentId },
          {
            $set: { content: text, isExtractingText: false },
          }
        );

        logger.info("DOCUMENT UPDATED WITH EXTRACTED TEXT");
      }
    }
  }
);
