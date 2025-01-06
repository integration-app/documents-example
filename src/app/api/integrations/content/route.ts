import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { KnowledgeModel } from '@/models/knowledge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    await connectDB();
    
    if (connectionId) {
      // Single item fetch for file picker
      const content = await KnowledgeModel.findOne({ 
        connectionId 
      }).lean();

      if (!content) {
        return NextResponse.json({ files: [] });
      }

      return NextResponse.json(content);
    } else {
      // List fetch for knowledge page
      const contents = await KnowledgeModel.find()
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json(contents);
    }
  } catch (error) {
    console.error('Failed to fetch content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' }, 
      { status: 500 }
    );
  }
} 