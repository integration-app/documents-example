import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { processAndUploadFile } from "@/lib/s3-utils";
import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";
import path from "path";

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

    console.log("Raw payload:", rawPayload);

    // Validate the payload
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
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    let s3Url: string | undefined;

    if (downloadURI) {
      try {
        const fileExtension = path.extname(downloadURI);
        const s3Key = `${connectionId}/${documentId}${fileExtension}`;

        s3Url = await processAndUploadFile(downloadURI, s3Key);
      } catch (error) {
        console.error("Failed to process file:", error);
        return NextResponse.json(
          { error: "Failed to process file" },
          { status: 500 }
        );
      }
    }

    await DocumentModel.updateOne(
      { connectionId, id: documentId },
      { $set:{
        lastSyncedAt: new Date().toISOString(),
        isDownloading: false,
        ...(text ? { content: text }: {}),
        ...(downloadURI && s3Url ? { storageKey: s3Url }: {}),
      } }
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
