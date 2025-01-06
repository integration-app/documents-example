import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const INTEGRATION_APP_TOKEN_HEADER = 'x-integration-app-token';
const WORKSPACE_SECRET = process.env.INTEGRATION_APP_WORKSPACE_SECRET!;

interface IntegrationAppTokenPayload {
  iss: string;      // Workspace key
  sub: string;      // User ID
  fields: Record<string, any>; // User fields
}

export async function verifyIntegrationAppToken(request: NextRequest): Promise<IntegrationAppTokenPayload | null> {
  const token = request.headers.get(INTEGRATION_APP_TOKEN_HEADER);
  
  if (!token) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(
      token,
      encoder.encode(WORKSPACE_SECRET)
    );

    return payload as any;
  } catch (error) {
    console.error('Failed to verify integration.app token:', error);
    return null;
  }
} 