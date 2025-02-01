import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { triggerDownloadDocumentFlow } from "@/lib/flows";
import { getAuthFromRequest } from "@/lib/server-auth";
import { generateIntegrationToken } from "@/lib/integration-token";
import { findParentSubscription } from "@/lib/document-utils";

/**
 * This webhook is triggered when a document is created
 */
const webhookSchema = z.object({
  connectionId: z.string(),
  userId: z.string(),
  fields: z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    parentId: z.string(),
    canHaveChildren: z.boolean(),
    resourceURI: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log("Webhook received:", body);
  try {
    const payload = webhookSchema.safeParse(body);

    if (!payload.success) {
      console.error("Invalid webhook payload:", payload.error);
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const { fields, connectionId, userId } = payload.data;

    await connectDB();

    const existingDoc = await DocumentModel.findOne({ id: fields.id });

    /**
     * If some parent document is subscribed, we need to subscribe to this document
     * and kick off the download flow if it's a file
     */
    if (!existingDoc) {
      const parentHasSubscription = await findParentSubscription(fields.id);

      const isFile = !fields.canHaveChildren;

      const result = await DocumentModel.bulkWrite([
        {
          insertOne: {
            document: {
              ...fields,
              isSubscribed: parentHasSubscription,
              isDownloading: isFile && parentHasSubscription,
              userId: userId,
              connectionId,
            },
          },
        },
      ]);

      console.log("Result:", result);

      const auth = getAuthFromRequest(request);
      const token = await generateIntegrationToken(auth);

      if (isFile && parentHasSubscription) {
        await triggerDownloadDocumentFlow(token, connectionId, fields.id);
      }
    } else {
      console.log(`Document with id ${fields.id} already exists`);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
