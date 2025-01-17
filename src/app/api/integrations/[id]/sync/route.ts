import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { KnowledgeModel } from '@/models/knowledge';
import { IntegrationAppClient } from '@integration-app/sdk';
import { getAuthFromRequest } from '@/lib/server-auth';
import { generateIntegrationToken } from '@/lib/integration-token';
import { DocumentModel } from '@/models/document';

interface SyncRequest {
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const connectionId = (await params).id;
    const { integrationId, integrationName, integrationLogo } = await request.json() as SyncRequest;
    
    await connectDB();

    // Start fresh sync by clearing old data
    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      { 
        $set: { 
          integrationId,
          integrationName,
          integrationLogo,
          syncStatus: 'in_progress',
          syncStartedAt: new Date(),
          documents: [] // Clear existing documents
        }
      },
      { upsert: true }
    );

    // Start async sync process
    syncDocuments(connectionId, request).catch(console.error);

    return NextResponse.json({ status: 'started' });
  } catch (error) {
    console.error('Failed to start sync:', error);
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    );
  }
}

async function syncDocuments(connectionId: string, request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const token = await generateIntegrationToken(auth);
    const integrationApp = new IntegrationAppClient({ token });

    let cursor: string | null = null;
    
    do {
      const result = await integrationApp
        .connection(connectionId)
        .action('list-documents')
        .run({ cursor });
      
      console.log(result, cursor);
      // Transform documents to match our schema
      const transformedDocs = result.output.records.map(doc => ({
        ...doc.fields,
        connectionId,
        isSubscribed: false,
        content: null
      }));

      // Save documents
      await DocumentModel.bulkWrite(
        transformedDocs.map(doc => ({
          updateOne: {
            filter: { id: doc.id, connectionId },
            update: { $set: doc },
            upsert: true
          }
        }))
      );
      
      cursor = result.output.cursor;
    
    } while (cursor);

    // Update with new documents
    const result = await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      { 
        $set: { 
          syncStatus: 'completed',
          syncCompletedAt: new Date(),
          syncError: null
        }
      },
      { new: true } // Return updated document
    );

  } catch (error) {
    console.error('Sync error:', error);
    await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      { 
        $set: { 
          syncStatus: 'failed',
          syncError: error.message,
          syncCompletedAt: new Date()
        }
      }
    );
    throw error;
  }
} 