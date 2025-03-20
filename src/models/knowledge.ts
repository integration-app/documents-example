import { Schema, model, models } from "mongoose";
import { Document } from "./document";

export const KnowledgeStatus = {
  in_progress: "in_progress",
  completed: "completed",
  failed: "failed",
} as const;

export type KnowledgeStatus = (typeof KnowledgeStatus)[keyof typeof KnowledgeStatus];

export interface Knowledge {
  userId: string;
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
  documents: Document[];
  syncStatus?: KnowledgeStatus;
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
      unique: true,
    },
    integrationId: {
      type: String,
      required: true,
    },
    integrationName: {
      type: String,
      required: true,
    },
    integrationLogo: String,
    syncStatus: {
      type: String,
      enum: Object.values(KnowledgeStatus)
    },
    syncStartedAt: Date,
    syncCompletedAt: Date,
    syncError: String,
  },
  {
    timestamps: true,
  }
);

// Recreate model if it exists
if (models?.Knowledge) {
  delete models.Knowledge;
}

export const KnowledgeModel = model<Knowledge>("Knowledge", knowledgeSchema);
