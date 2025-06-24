import { Schema, model, Document } from 'mongoose';
import { EmailCode } from '@/types';

export interface EmailCodeDocument extends EmailCode, Document {}

const EmailCodeSchema = new Schema<EmailCodeDocument>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    length: 6 // 6-digit numeric code
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'email_codes'
});

// Compound index for efficient queries
EmailCodeSchema.index({ email: 1, used: 1 });
EmailCodeSchema.index({ code: 1, used: 1 });

export const EmailCodeModel = model<EmailCodeDocument>('EmailCode', EmailCodeSchema); 