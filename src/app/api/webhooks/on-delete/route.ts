import { NextResponse } from "next/server";
import { z } from "zod";
import { DocumentModel } from "@/models/document";
import connectDB from "@/lib/mongodb";
import { deleteFileFromS3 } from "@/lib/s3-utils";
import { getAllDocsInTree } from "@/lib/document-utils";

/**
 * This webhook is when a document is deleted of a users app.
 * It is triggered for each child of the deleted document.
 */
const WebhookPayloadSchema = z.object({
  id: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = WebhookPayloadSchema.safeParse(body);

    if (!result.success) {
      console.error("Invalid webhook payload:", result.error);
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const payload = result.data;

    await connectDB();

    const documentIds = await getAllDocsInTree(payload.id);

    const documents = await DocumentModel.find({ id: { $in: documentIds } });

    for (const document of documents) {
      if (document.storageKey) {
        try {
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
    }

    await DocumentModel.deleteMany({ id: { $in: documentIds } });

    console.log(
      `Successfully deleted document ${payload.id} and all its children`
    );
    return NextResponse.json({ message: "ok" });
  } catch (error) {
    console.error("Error in on-delete webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
