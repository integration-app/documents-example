import { NextRequest, NextResponse } from 'next/server';
import { IntegrationAppClient } from '@integration-app/sdk';
import { getAuthFromRequest } from '@/lib/server-auth';
import { generateIntegrationToken } from '@/lib/integration-token';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const connectionId = (await params).id;
    const { documentId } = await request.json();
    const auth = getAuthFromRequest(request);
    const token = await generateIntegrationToken(auth);
    const integrationApp = new IntegrationAppClient({ token });

    const result = await integrationApp
      .connection(connectionId)
      .flow('download-document-as-text')
      .run({
        input: {
          id: documentId
        }
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
} 