import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/user';
import { getAuthFromRequest } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    // Get the customer ID from auth
    const auth = getAuthFromRequest(request);
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Filter users by customerId
    const users = await User.find({ customerId: auth.customerId })
      .select('userId userName createdAt updatedAt')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 