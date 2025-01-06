import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { KnowledgeModel } from '@/models/knowledge';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const connectionId = (await params).id;
    await connectDB();

    const knowledge = await KnowledgeModel.findOne({ connectionId }).lean();
    
    if (!knowledge) {
      return NextResponse.json({ status: 'not_found' });
    }

    return NextResponse.json({
      status: knowledge.syncStatus,
      error: knowledge.syncError,
      startedAt: knowledge.syncStartedAt,
      completedAt: knowledge.syncCompletedAt
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
} 