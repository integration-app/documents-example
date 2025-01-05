import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/user';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getIntegrationClient } from '@/lib/integration-app-client';

interface ExternalUser {
  id: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // 1. Get Integration.app client
    const client = await getIntegrationClient(auth);

    // 2. Find the first available connection
    const connectionsResponse = await client.connections.find();
    const firstConnection = connectionsResponse.items?.[0];

    if (!firstConnection) {
      return NextResponse.json(
        { error: 'No apps connected to import users from' },
        { status: 400 }
      );
    }

    // 3. Get users from the accounting system via Integration.app
    const result = await client
      .connection(firstConnection.id)
      .action('list-users')
      .run();

    // Type assertion since we know the shape of the response
    const externalUsers = (result.output.records as unknown as ExternalUser[]);

    // 4. Delete existing users for this customer
    await User.deleteMany({ customerId: auth.customerId });

    // 5. Create new users from the imported data
    const users = await User.create(
      externalUsers.map((extUser) => ({
        userId: extUser.id,
        userName: extUser.name,
        customerId: auth.customerId,
      }))
    );

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error importing users:', error);
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    );
  }
} 