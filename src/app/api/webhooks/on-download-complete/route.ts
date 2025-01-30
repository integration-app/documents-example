import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";

interface WebhookPayload {
  downloadURI?: string;
  documentId: string;
  text?: string;
  connectionId: string;
}

export async function POST(request: Request) {
  try {
    const payload: WebhookPayload = await request.json();

    const { downloadURI, documentId, text, connectionId } = payload;

    await connectDB();

    const document = await DocumentModel.findOne({
      connectionId,
      id: documentId,
    });

    if (!document) {
      console.error(`Document with id ${documentId} not found`);
    }

    const update: Record<string, unknown> = {
      lastSyncedAt: new Date().toISOString(),
      ...(downloadURI && { resourceURI: downloadURI }),
      ...(text && { content: text }),
    };

    await DocumentModel.updateOne(
      { connectionId, id: documentId },
      { $set: update }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to process webhook:", error);
  }

  return NextResponse.json({ error: "Webhook received" }, { status: 200 });
}
