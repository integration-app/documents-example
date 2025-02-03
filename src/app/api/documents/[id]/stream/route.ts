import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import connectDB from "@/lib/mongodb";
import { DocumentModel } from "@/models/document";
import { getS3ObjectStream } from "@/lib/s3-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth?.customerId) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();
    const documentId = (await params).id;

    const document = await DocumentModel.findOne({ id: documentId });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    if (!document.downloadURI) {
      return new NextResponse("No download URL available", { status: 404 });
    }

    const s3Stream = await getS3ObjectStream(document.downloadURI);

    if (!s3Stream) {
      return new NextResponse("Failed to get document stream", { status: 500 });
    }

    // Create headers for the response
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "application/octet-stream");
    responseHeaders.set(
      "Content-Disposition",
      `attachment; filename="${document.title}"`
    );

    // Return the stream with appropriate headers
    return new NextResponse(s3Stream as ReadableStream, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error streaming document:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
