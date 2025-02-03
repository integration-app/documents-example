import { Schema, model, models } from 'mongoose';
import { Document } from './document';
export interface Knowledge {
  userId: string;
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
  documents: Document[];
  syncStatus?: 'in_progress' | 'completed' | 'failed';
  syncStartedAt?: Date;
  syncCompletedAt?: Date;
  syncError?: string;
}

const knowledgeSchema = new Schema<Knowledge>(
  {
    userId: { 
      type: String, 
      required: true, 
    },
    connectionId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    integrationId: { 
      type: String, 
      required: true 
    },
    integrationName: { 
      type: String, 
      required: true 
    },
    integrationLogo: String,
    syncStatus: {
      type: String,
      enum: ['in_progress', 'completed', 'failed']
    },
    syncStartedAt: Date,
    syncCompletedAt: Date,
    syncError: String
  },
  {
    timestamps: true
  }
);

// Recreate model if it exists
if (models.Knowledge) {
  delete models.Knowledge;
}

export const KnowledgeModel = model<Knowledge>('Knowledge', knowledgeSchema); 