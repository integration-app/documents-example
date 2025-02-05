import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { deleteFileFromS3, processAndUploadFile } from "@/lib/s3-utils";
import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';  

const onDownloadCompleteWebhookPayloadSchema = z.object({
  downloadURI: z.string().url().optional(),
  documentId: z.string(),
  text: z.string().optional(),
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
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!downloadURI) {
      return NextResponse.json({ success: true }, { status: 200 });
    }


    let newStorageKey: string | undefined;

    try {
      newStorageKey = await processAndUploadFile(
        downloadURI,
        `${connectionId}/${documentId}/${uuidv4()}/${document.title}`
      );
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

    await DocumentModel.updateOne(
      { connectionId, id: documentId },
      {
        $set: {
          lastSyncedAt: new Date().toISOString(),
          isDownloading: false,
          ...(text ? { content: text } : {}),
          ...(downloadURI && newStorageKey
            ? { storageKey: newStorageKey }
            : {}),
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
