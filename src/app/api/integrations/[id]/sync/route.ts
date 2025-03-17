import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { inngest } from "@/inngest/client";
import { generateIntegrationToken } from "@/lib/integration-token";
import connectDB from "@/lib/mongodb";
import { KnowledgeModel } from "@/models/knowledge";

interface SyncRequest {
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
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
    const token = await generateIntegrationToken(auth);

    await connectDB();

    const userId = auth.customerId;

    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          userId,
          integrationId,
          integrationName,
          integrationLogo,
          syncStatus: "in_progress",
          syncStartedAt: new Date(),
          syncError: null,
        },
      },
      { upsert: true }
    );

    await inngest.send({
      name: "integration/sync-documents",
      data: {
        connectionId,
        token,
        userId: auth.customerId,
      },
    });

    return NextResponse.json({ status: "started" });
  } catch (error) {
    console.error("Failed to start sync:", error);
    return NextResponse.json(
      { error: "Failed to start sync" },
      { status: 500 }
    );
  }
}
