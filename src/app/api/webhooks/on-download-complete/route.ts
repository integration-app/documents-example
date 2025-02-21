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
  text: z
    .union([
      z.string().min(1),
      z
        .string()
        .length(0)
        .transform(() => undefined),
    ])
    .optional(),
  connectionId: z.string(),
});

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

    console.log("document to update", document);

    if (!document) {
      console.error(`Document with id ${documentId} not found`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    let updateData = {};
    let buffer: Buffer | undefined;

    if (downloadURI) {
      let newStorageKey: string | undefined;

      try {
        const { keyWithExtension, buffer: _buffer } =
          await processAndUploadFileToS3(
            downloadURI,
            `${connectionId}/${documentId}/${uuidv4()}/${document.title}`
          );

        newStorageKey = keyWithExtension;
        buffer = _buffer;
      } catch (error) {
        console.error("Failed to process file:", error);
        return NextResponse.json(
          { error: "Failed to process file" },
          { status: 500 }
        );
      }

      // Delete existing file from S3 if it exists
      if (document.storageKey) {
        try {
          console.log(`Deleting file with key ${document.storageKey} from S3`);
          await deleteFileFromS3(document.storageKey);
          console.log(
            `Successfully deleted file with key ${document.storageKey} from S3`
          );
        } catch (s3Error) {
          console.error(
            `Failed to delete file from S3: ${document.storageKey}`,
            s3Error
          );
        }
      }

      updateData = newStorageKey ? { storageKey: newStorageKey } : {};
    }

    if (text) {
      updateData = {
        content: text,
      };
    }

    const documentAfterDownloadStatusIsUpdated =
      await DocumentModel.findOneAndUpdate(
        { connectionId, id: documentId },
        {
          $set: {
            lastSyncedAt: new Date().toISOString(),
            isDownloading: false,
            ...updateData,
          },
        },
        { new: true }
      );

    if (
      documentAfterDownloadStatusIsUpdated?.storageKey &&
      UnstructuredIsEnabled &&
      downloadURI &&
      buffer
    ) {
      const _isSupportedFile = isSupportedFile(
        documentAfterDownloadStatusIsUpdated.title
      );

      if (_isSupportedFile) {
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

        await DocumentModel.updateOne(
          { connectionId, id: documentId },
          {
            $set: { content: text, isExtractingText: false },
          }
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to process webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
