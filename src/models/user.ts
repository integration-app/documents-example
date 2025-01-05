import mongoose from 'mongoose';

export interface IUser {
  userId: string;
  userName: string | null;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
      default: null,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indices for common queries
userSchema.index({ customerId: 1, createdAt: -1 });
userSchema.index({ userId: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema); 