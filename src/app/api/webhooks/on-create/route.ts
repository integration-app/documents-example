import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { triggerDownloadDocumentFlow } from "@/lib/flows";
import { findParentSubscription } from "@/lib/document-utils";
import { KnowledgeModel } from "@/models/knowledge";

/**
 * This webhook is triggered when a document is created
 */
const webhookSchema = z.object({
  connectionId: z.string(),
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

    const { fields, connectionId } = payload.data;

    await connectDB();

    // The knowledge model has the userId, let's grab it
    const knowledge = await KnowledgeModel.findOne({ connectionId });
    const userId = knowledge?.userId;

    if (!userId) {
      console.error("User ID not found for connection:", connectionId);
      return NextResponse.json(
        { error: "User ID not found for connection" },
        { status: 400 }
      );
    }

    const existingDoc = await DocumentModel.findOne({ id: fields.id });

    if (!existingDoc) {
      const parentHasSubscription = await findParentSubscription(
        fields.parentId
      );

      console.log("Parent has subscription:", parentHasSubscription);

      const isFile = !fields.canHaveChildren;

      /**
       * If some parent document is subscribed, we need to add isSubscribed to this document
       * and kick off the download flow if it's a file
       */
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


      if (isFile && parentHasSubscription) {
        try {
       
          // TODO: GENERATE A TOKEN

          await triggerDownloadDocumentFlow("token", connectionId, fields.id);
        
        } catch (error) {
         
          await DocumentModel.updateOne(
            { id: fields.id },
            { $set: { isDownloading: false } }
          );

          console.error("Error triggering download flow:", error);
        }
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
