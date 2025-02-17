import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { KnowledgeModel } from "@/models/knowledge";
import { getAuthFromRequest } from "@/lib/server-auth";

export async function GET(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  const userId = auth.customerId;

  try {
    await connectDB();

    // Get all subscribed documents
    const documents = await DocumentModel.find({
      isSubscribed: true,
      userId,
    }).lean();

    // Get integration info for each unique connectionId
    const connections = await KnowledgeModel.find({
      connectionId: {
        $in: [...new Set(documents.map((doc) => doc.connectionId))],
      },
    }).lean();

    // Group documents by connectionId
    const groupedByConnection = connections.map((connection) => {
      const connectionDocuments = documents.filter(
        (doc) => doc.connectionId === connection.connectionId
      );

      return {
        connectionId: connection.connectionId,
        integrationId: connection.integrationId,
        integrationName: connection.integrationName,
        integrationLogo: connection.integrationLogo,
        documents: connectionDocuments,
      };
    });

    return NextResponse.json(groupedByConnection);
  } catch (error) {
    console.error("Failed to fetch subscribed documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribed documents" },
      { status: 500 }
    );
  }
}
