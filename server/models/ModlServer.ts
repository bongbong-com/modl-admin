import { Schema, model, Document } from 'mongoose';
import { ModlServer } from '@/types';

export interface ModlServerDocument extends ModlServer, Document {}

const ModlServerSchema = new Schema<ModlServerDocument>({
  serverName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customDomain: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  adminEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  provisioningStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  databaseName: {
    type: String,
    sparse: true
  },
  customDomain_override: {
    type: String,
    sparse: true
  },
  customDomain_status: {
    type: String,
    enum: ['pending', 'active', 'error', 'verifying'],
    sparse: true
  },
  customDomain_lastChecked: {
    type: Date,
    sparse: true
  },
  customDomain_error: {
    type: String,
    sparse: true
  },
  stripe_customer_id: {
    type: String,
    sparse: true
  },
  stripe_subscription_id: {
    type: String,
    sparse: true
  },
  subscription_status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'inactive'],
    default: 'inactive',
    index: true
  },
  current_period_end: {
    type: Date,
    sparse: true
  },
  userCount: {
    type: Number,
    default: 0
  },
  ticketCount: {
    type: Number,
    default: 0
  },
  region: {
    type: String,
    trim: true,
    sparse: true
  },
  lastActivityAt: {
    type: Date,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'modl_servers'
});

// Indexes for better performance
ModlServerSchema.index({ adminEmail: 1 });
ModlServerSchema.index({ plan: 1, subscription_status: 1 });
ModlServerSchema.index({ createdAt: -1 });
ModlServerSchema.index({ provisioningStatus: 1, emailVerified: 1 });

// Add text index for searching
ModlServerSchema.index({ serverName: 'text', customDomain: 'text', adminEmail: 'text' });

export const ModlServerModel = model<ModlServerDocument>('ModlServer', ModlServerSchema); 