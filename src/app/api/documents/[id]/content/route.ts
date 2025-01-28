import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { DocumentModel } from '@/models/document';
import { getAuthFromRequest } from '@/lib/server-auth';
import { verifyIntegrationAppToken } from '@/lib/integration-app-auth';

async function authenticateRequest(request: NextRequest): Promise<boolean> {
  // Try integration.app token first
  const integrationAppAuth = await verifyIntegrationAppToken(request);
  if (integrationAppAuth) {
    return true;
  }

  // Fall back to default auth
  try {
    const auth = getAuthFromRequest(request);
    return !!auth;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await authenticateRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const documentId = (await params).id;

    const document = await DocumentModel.findOne({ id: documentId }).lean();
    
    if (!document) {
      return NextResponse.json({ content: '' });
    }

    return NextResponse.json({ content: document.content || '' });
  } catch (error) {
    console.error('Failed to get document content:', error);
    return NextResponse.json(
      { error: 'Failed to get document content' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await authenticateRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const documentId = (await params).id;
    const { content } = await request.json();

    const updatedDocument = await DocumentModel.findOneAndUpdate(
      { id: documentId },
      { 
        $set: { 
          content,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ content: updatedDocument.content });
  } catch (error) {
    console.error('Failed to update document content:', error);
    return NextResponse.json(
      { error: 'Failed to update document content' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await authenticateRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const documentId = (await params).id;
    const { content } = await request.json();

    const updatedDocument = await DocumentModel.findOneAndUpdate(
      { id: documentId },
      { 
        $set: { 
          content,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ content: updatedDocument.content });
  } catch (error) {
    console.error('Failed to update document content:', error);
    return NextResponse.json(
      { error: 'Failed to update document content' },
      { status: 500 }
    );
  }
} 