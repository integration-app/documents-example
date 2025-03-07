import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { KnowledgeModel } from "@/models/knowledge";
import { IntegrationAppClient } from "@integration-app/sdk";
import { getAuthFromRequest } from "@/lib/server-auth";
import { generateIntegrationToken } from "@/lib/integration-token";
import { DocumentModel, Document } from "@/models/document";

interface SyncRequest {
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
}

interface ListDocumentsActionRecord {
  fields: Exclude<Document, "connectionId" | "content" | "userId">;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;
    const { integrationId, integrationName, integrationLogo } =
      (await request.json()) as SyncRequest;
    const auth = getAuthFromRequest(request);

    await connectDB();

    // Start fresh sync by clearing old data
    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          userId: auth.customerId,
          integrationId,
          integrationName,
          integrationLogo,
          syncStatus: "in_progress",
          syncStartedAt: new Date(),
          documents: [], // Clear existing documents
        },
      },
      { upsert: true }
    );

    // Start async sync process
    syncDocuments(connectionId, request).catch(console.error);

    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Failed to start sync:", error);
    return NextResponse.json(
      { error: "Failed to start sync" },
      { status: 500 }
    );
  }
}

async function syncDocuments(connectionId: string, request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const token = await generateIntegrationToken(auth);
    const integrationApp = new IntegrationAppClient({ token });

    let cursor: string | undefined = undefined;
    let totalDocumentsSynced = 0;
    const DOCUMENT_LIMIT = 1000;

    do {
      const result = await integrationApp
        .connection(connectionId)
        .action("list-documents")
        .run({ cursor });

      const records = result.output.records as ListDocumentsActionRecord[];

      // Transform documents to match our schema
      const transformedDocs = records.map((doc) => ({
        ...doc.fields,
        connectionId,
        isSubscribed: false,
        content: null,
        userId: auth.customerId,
      }));

      // Calculate how many documents we can process without exceeding the limit
      const remainingDocsCount = DOCUMENT_LIMIT - totalDocumentsSynced;
      const docsToProcess = Math.min(
        transformedDocs.length,
        remainingDocsCount
      );

      // Only process up to the limit
      const docsToSave = transformedDocs.slice(0, docsToProcess);

      // Save documents
      if (docsToSave.length > 0) {
        await DocumentModel.bulkWrite(
          docsToSave.map((doc) => ({
            updateOne: {
              filter: { id: doc.id, connectionId },
              update: { $set: doc },
              upsert: true,
            },
          }))
        );
      }

      totalDocumentsSynced += docsToSave.length;

      // Stop if we've reached the limit
      if (totalDocumentsSynced >= DOCUMENT_LIMIT) {
        break;
      }

      cursor = result.output.cursor;
    } while (cursor);

    // Mark sync for the connection as completed
    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          syncStatus: "completed",
          syncCompletedAt: new Date(),
          syncError: null,
          totalDocuments: totalDocumentsSynced, // Add the total number of documents synced
        },
      },
      { new: true }
    );
  } catch (error) {
    console.error("Sync error:", JSON.stringify(error, null, 2));
    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          syncStatus: "failed",
          syncError: (error as Error).message,
          syncCompletedAt: new Date(),
        },
      }
    );
    throw error;
  }
}
