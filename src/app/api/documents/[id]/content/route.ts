import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { getAuthFromRequest } from "@/lib/server-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const id = (await params).id;

    const document = await DocumentModel.findById(id);

    if (!document) {
      return NextResponse.json({ content: "" });
    }

    return NextResponse.json({ content: document.content || "" });
  } catch (error) {
    console.error("Failed to get document content:", error);
    return NextResponse.json(
      { error: "Failed to get document content" },
      { status: 500 }
    );
  }
}
