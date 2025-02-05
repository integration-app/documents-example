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

    const searchParams = request.nextUrl.searchParams;
    const storageKey = searchParams.get("storageKey");

    if (!storageKey) {
      return new NextResponse("Storage key is required", { status: 400 });
    }

    const documentId = (await params).id;

    await connectDB();

    const document = await DocumentModel.findOne({
      storageKey,
      id: documentId,
    });

    console.log("Document:", document);

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    if (!document.storageKey) {
      return new NextResponse("No download URL available", { status: 404 });
    }

    const { Body, ContentType, ContentLength } = await getS3ObjectStream(
      document.storageKey
    );

    if (!Body) {
      return new NextResponse("Failed to get document stream", { status: 500 });
    }

    const responseHeaders = new Headers();

    responseHeaders.set(
      "Content-Type",
      ContentType || "application/octet-stream"
    );
    responseHeaders.set("Content-Length", String(ContentLength!));
    responseHeaders.set(
      "Content-Disposition",
      `attachment; filename="${document.title}"`
    );

    return new NextResponse(Body as ReadableStream, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error streaming document:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
