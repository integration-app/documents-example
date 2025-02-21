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

    // Get all subscribed documents with truncated content
    const documents = await DocumentModel.aggregate([
      {
        $match: {
          isSubscribed: true,
          userId,
        },
      },
      {
        $project: {
          _id: 1,
          id: 1,
          connectionId: 1,
          title: 1,
          content: { $substr: ["$content", 0, 10] }, //Truncate for performance
          createdAt: 1,
          updatedAt: 1,
          resourceURI: 1,
          storageKey: 1,
          parentId: 1,
          userId: 1,
          isSubscribed: 1,
          isDownloading: 1,
          canHaveChildren: 1,
          isExtractingText: 1,
        },
      },
    ])

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
