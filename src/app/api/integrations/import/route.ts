import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { KnowledgeModel } from '@/models/knowledge';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { integrationId, integrationType, connectionId, files } = await request.json();
    
    const knowledge = await KnowledgeModel.findOneAndUpdate(
      { connectionId },
      {
        $set: {
          integrationId,
          integrationType,
          files,
          connectionId,
        }
      },
      { 
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({ success: true, knowledge });
  } catch (error) {
    console.error('Failed to import files:', error);
    return NextResponse.json(
      { error: 'Failed to import files' }, 
      { status: 500 }
    );
  }
} 