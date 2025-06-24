import { Schema, model, Document } from 'mongoose';

export interface ISystemLog extends Document {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string; // server name or 'system'
  metadata: Record<string, any>;
  timestamp: Date;
  serverId?: string; // ObjectId as string
  category?: string; // e.g., 'auth', 'database', 'api', 'moderation'
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  stackTrace?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  tags?: string[];
}

const SystemLogSchema = new Schema<ISystemLog>({
  level: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'error', 'critical'],
    index: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  serverId: {
    type: String,
    index: true
  },
  category: {
    type: String,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  userId: String,
  stackTrace: String,
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedBy: String,
  resolvedAt: Date,
  tags: [{
    type: String,
    index: true
  }]
}, {
  timestamps: false, // We use custom timestamp field
});

// Indexes for efficient querying
SystemLogSchema.index({ timestamp: -1 });
SystemLogSchema.index({ level: 1, timestamp: -1 });
SystemLogSchema.index({ source: 1, timestamp: -1 });
SystemLogSchema.index({ serverId: 1, timestamp: -1 });
SystemLogSchema.index({ resolved: 1, level: 1, timestamp: -1 });
SystemLogSchema.index({ message: 'text', source: 'text', category: 'text' });

// TTL index to automatically delete old logs after 90 days
SystemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SystemLogModel = model<ISystemLog>('SystemLog', SystemLogSchema); 