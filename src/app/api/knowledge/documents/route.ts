import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { KnowledgeModel } from '@/models/knowledge';
import { IntegrationAppClient } from '@integration-app/sdk';
import { getAuthFromRequest } from '@/lib/server-auth';

export async function GET() {
  try {
    await connectDB();

    // Get all documents with subscriptions
    const knowledgeRecords = await KnowledgeModel.find({
      'documents.isSubscribed': true
    }).lean();

    // Group documents by integration
    const integrationDocuments = knowledgeRecords.map(record => ({
      integrationId: record.integrationId,
      integrationName: record.integrationName,
      integrationLogo: record.integrationLogo,
      documents: record.documents.filter(doc => doc.isSubscribed)
    }));

    return NextResponse.json(integrationDocuments);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
} 