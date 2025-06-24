import { Schema, model, Document } from 'mongoose';
import { AdminUser } from '@/types';

export interface AdminUserDocument extends AdminUser, Document {}

const AdminUserSchema = new Schema<AdminUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  loggedInIps: [{
    type: String,
    trim: true
  }],
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // We're handling createdAt manually
  collection: 'admin_users'
});

// Indexes for better performance
AdminUserSchema.index({ lastActivityAt: -1 });

export const AdminUserModel = model<AdminUserDocument>('AdminUser', AdminUserSchema); 