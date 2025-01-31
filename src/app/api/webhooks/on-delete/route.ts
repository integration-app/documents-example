import { NextResponse } from "next/server";
import { z } from "zod";
import { DocumentModel } from "@/models/document";
import connectDB from "@/lib/mongodb";

/**
 * This webhook is when a document is deleted of a users app.
 * It is triggered for each child of the deleted document.
 */
const WebhookPayloadSchema = z.object({
  source: z.string(),
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

    // Find and delete the document
    const document = await DocumentModel.findOneAndDelete({
      id: payload.id,
    });

    if (!document) {
      console.log(`No document found with id: ${payload.id}`);
      return NextResponse.json({ message: "ok" });
    }

    console.log(`Successfully deleted document ${payload.id}`);
    return NextResponse.json({ message: "ok" });
  } catch (error) {
    console.error("Error in on-delete webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
