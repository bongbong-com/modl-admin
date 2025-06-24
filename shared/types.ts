import 'express-session'; // Import to augment the module

// Augment express-session
declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    email?: string;
    isAuthenticated?: boolean;
  }
}

// Admin User Interface (simplified as per updated plan)
export interface AdminUser {
  email: string;
  loggedInIps: string[];
  lastActivityAt: Date;
  createdAt: Date;
}

// System Log Interface
export interface SystemLog {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string; // server name or 'system'
  metadata: Record<string, any>;
  timestamp: Date;
  serverId?: string;
}

// Admin Action Interface
export interface AdminAction {
  adminId: string;
  action: string;
  target: string; // server ID, user ID, etc.
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

// Modl Server Interface (from global database)
export interface ModlServer {
  serverName: string;
  customDomain: string;
  adminEmail: string;
  plan: 'free' | 'premium';
  emailVerified: boolean;
  provisioningStatus: 'pending' | 'in-progress' | 'completed' | 'failed';
  databaseName?: string;
  customDomain_override?: string;
  customDomain_status?: 'pending' | 'active' | 'error' | 'verifying';
  customDomain_lastChecked?: Date;
  customDomain_error?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'inactive';
  current_period_end?: Date;
  userCount: number;
  ticketCount: number;
  region?: string;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Code Verification Interface
export interface EmailCode {
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Dashboard Statistics Interface
export interface DashboardStats {
  totalServers: number;
  activeServers: number;
  premiumServers: number;
  freeServers: number;
  recentRegistrations: number;
  totalUsers: number;
  systemErrors: number;
  uptime: number;
}

// Server Analytics Interface
export interface ServerAnalytics {
  registrationTrends: {
    date: string;
    count: number;
  }[];
  planDistribution: {
    free: number;
    premium: number;
  };
  geographicDistribution: {
    country: string;
    count: number;
  }[];
  activityMetrics: {
    dailyActiveServers: number;
    weeklyActiveServers: number;
    monthlyActiveServers: number;
  };
}

// Bulk Operation Interface
export interface BulkOperation {
  action: 'delete' | 'suspend' | 'activate' | 'reset-database' | 'update-plan';
  serverIds: string[];
  parameters?: Record<string, any>;
}

// Session Interface
export interface AdminSession {
  adminId: string;
  email: string;
  ipAddress: string;
  lastActivity: Date;
}

// Express Request Extension
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
} 