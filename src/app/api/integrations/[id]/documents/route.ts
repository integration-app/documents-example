import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const connectionId = (await params).id;

    if (!connectionId) {
      return NextResponse.json({ documents: [] });
    }

    await connectDB();

    let query: {
      connectionId: string;
      title?: { $regex: string; $options: string };
    } = { connectionId };
    if (searchQuery) {
      query = {
        ...query,
        title: { $regex: searchQuery, $options: "i" },
      };
    }

    const documents = await DocumentModel.find(query).lean();

    console.log("Documents:", JSON.stringify(documents, null, 2));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

