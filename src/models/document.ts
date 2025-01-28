import { Schema, model, models } from 'mongoose';

export type DocumentType = 'document' | 'folder';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  previewUri?: string;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  isSubscribed: boolean;
  connectionId: string;
  content?: string;
  userId: string;
}

interface DocumentWithConnection extends Document {
  connectionId: string;
  content?: string;
}

const documentSchema = new Schema<DocumentWithConnection>({
  id: String,
  connectionId: String,
  title: String,
  type: {
    type: String,
    enum: ['document', 'folder'],
    default: 'document',
    required: true
  },
  previewUri: String,
  createdAt: String,
  updatedAt: String,
  folderId: String,
  userId: String,
  isSubscribed: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    default: null
  }
}, {
  _id: false
});

// Create compound unique index on business key
documentSchema.index({ id: 1, connectionId: 1 }, { unique: true });

if (models.Document) {
  delete models.Document;
}

export const DocumentModel = model<DocumentWithConnection>('Document', documentSchema); 