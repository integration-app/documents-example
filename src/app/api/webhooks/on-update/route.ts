import { DocumentModel } from "@/models/document";
import { NextResponse } from "next/server";
import { z } from "zod";

const webhookSchema = z.object({
  connectionId: z.string(),
  fields: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    parentId: z.string().min(1),
    canHaveChildren: z.boolean(),
    resourceURI: z.string().url(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("body", body);

    const payload = webhookSchema.safeParse(body);

    if (!payload.success) {
      console.error("Invalid webhook payload:", payload.error);
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const { fields, connectionId } = payload.data;

    // TODO: Spread fields once we fix issue in drive connector
    await DocumentModel.updateOne(
      { id: fields.id, connectionId },
      {
        $set: {
          title: fields.title,
          updatedAt: fields.updatedAt,
          resourceURI: fields.resourceURI,
        },
      }
    );

    return NextResponse.json({ message: "ok" });
  } catch (error) {
    console.error("Error in on-update webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
