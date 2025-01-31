import { NextRequest, NextResponse } from "next/server";
import { IntegrationAppClient } from "@integration-app/sdk";
import { getAuthFromRequest } from "@/lib/server-auth";
import { generateIntegrationToken } from "@/lib/integration-token";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;
    const { documentId } = await request.json();

    await connectDB();

    // Check if document exists and isn't already downloading
    const document = await DocumentModel.findOne({
      connectionId,
      id: documentId,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.isDownloading) {
      return NextResponse.json(
        { error: "Document is already being downloaded" },
        { status: 409 }
      );
    }

    // Mark document as downloading
    await DocumentModel.updateOne(
      { connectionId, id: documentId },
      { $set: { isDownloading: true } }
    );

    const auth = getAuthFromRequest(request);
    const token = await generateIntegrationToken(auth);
    const integrationApp = new IntegrationAppClient({ token });

    const result = await integrationApp
      .connection(connectionId)
      .flow("download-document")
      .run({
        input: {
          documentId,
        },
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Download error:", error);
    
    // Reset downloading status in case of error
    try {
      const { documentId } = await request.json();
      const connectionId = (await params).id;
      
      await DocumentModel.updateOne(
        { connectionId, id: documentId },
        { $set: { isDownloading: false } }
      );
    } catch (resetError) {
      console.error("Failed to reset downloading status:", resetError);
    }

    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}
