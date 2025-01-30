import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { getAuthFromRequest } from "@/lib/server-auth";
import { generateIntegrationToken } from "@/lib/integration-token";
import { IntegrationAppClient } from "@integration-app/sdk";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connectionId = (await params).id;
    const { documentIds, isSubscribed } = await request.json();

    await connectDB();

    /**
     * `documentIds` is an array of document IDs that we need to subscribe to, some
     * of them are documents of file type some are documents of folder
     *
     * We are going to persist this state to the backend and kick off initial download flow
     * for the documents that are of file type
     */

    await DocumentModel.updateMany(
      {
        connectionId,
        id: { $in: documentIds },
      },
      { $set: { isSubscribed } }
    );

    const auth = getAuthFromRequest(request);
    const token = await generateIntegrationToken(auth);
    const integrationApp = new IntegrationAppClient({ token });

    // Trigger download for subscribed documents
    for (const documentId of documentIds) {
      const document = await DocumentModel.findOne({
        connectionId,
        id: documentId,
      });

      const isAFolder = document?.canHaveChildren;
      const unsubScribeFile = !isSubscribed;
      const noDocumentFound = !document;

      if (isAFolder || unsubScribeFile || noDocumentFound) {
        continue;
      }

      await integrationApp
        .connection(connectionId)
        .flow("download-document")
        .run({
          input: {
            documentId,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
