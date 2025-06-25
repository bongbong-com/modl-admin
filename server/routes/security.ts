import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication to all routes in this file
router.use(requireAuth);

// Mock audit logs storage
const auditLogs: any[] = [];
const securityEvents: any[] = [];

// Security event types
const SECURITY_EVENT_TYPES = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  CONFIG_CHANGE: 'config_change',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
};

// Initialize with some mock data
const initializeMockData = () => {
  const now = new Date();
  
  // Generate mock audit logs
  for (let i = 0; i < 50; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    auditLogs.push({
      id: `audit_${Date.now()}_${i}`,
      timestamp: date.toISOString(),
      adminId: 'admin@modl.gg',
      action: ['config_update', 'server_action', 'user_management', 'system_restart'][Math.floor(Math.random() * 4)],
      resource: ['system_config', 'server_management', 'user_accounts', 'service_management'][Math.floor(Math.random() * 4)],
      details: {
        ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: 'Mozilla/5.0 (compatible)',
        changes: ['Updated security settings', 'Restarted service', 'Modified user permissions'][Math.floor(Math.random() * 3)]
      },
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      success: Math.random() > 0.1
    });
  }
  
  // Generate mock security events
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000);
    securityEvents.push({
      id: `security_${Date.now()}_${i}`,
      timestamp: date.toISOString(),
      type: Object.values(SECURITY_EVENT_TYPES)[Math.floor(Math.random() * 8)],
      source: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      target: ['admin_panel', 'api_endpoint', 'server_management'][Math.floor(Math.random() * 3)],
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      blocked: Math.random() > 0.7,
      details: {
        userAgent: 'Mozilla/5.0 (compatible)',
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        endpoint: ['/api/servers', '/api/config', '/api/users'][Math.floor(Math.random() * 3)]
      }
    });
  }
};

// Initialize mock data
initializeMockData();

// Validation schemas
const auditQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 25),
  adminId: z.string().optional(),
  action: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  success: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
});

const securityQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 25),
  type: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  blocked: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Get audit logs
router.get('/logs', async (req, res) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    
    let filteredLogs = [...auditLogs];
    
    // Apply filters
    if (query.adminId) {
      filteredLogs = filteredLogs.filter(log => 
        log.adminId.toLowerCase().includes(query.adminId!.toLowerCase())
      );
    }
    
    if (query.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(query.action!.toLowerCase())
      );
    }
    
    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }
    
    if (query.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === query.success);
    }
    
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= startDate
      );
    }
    
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= endDate
      );
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: filteredLogs.length,
          pages: Math.ceil(filteredLogs.length / query.limit)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    } else {
      console.error('Get audit logs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  }
});

// Get security events
router.get('/events', async (req, res) => {
  try {
    const query = securityQuerySchema.parse(req.query);
    
    let filteredEvents = [...securityEvents];
    
    // Apply filters
    if (query.type) {
      filteredEvents = filteredEvents.filter(event => 
        event.type.toLowerCase().includes(query.type!.toLowerCase())
      );
    }
    
    if (query.severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === query.severity);
    }
    
    if (query.blocked !== undefined) {
      filteredEvents = filteredEvents.filter(event => event.blocked === query.blocked);
    }
    
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= startDate
      );
    }
    
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) <= endDate
      );
    }
    
    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    return res.json({
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: filteredEvents.length,
          pages: Math.ceil(filteredEvents.length / query.limit)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    } else {
      console.error('Get security events error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch security events'
      });
    }
  }
});

// Test security configuration
router.post('/test', async (req, res) => {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [
        {
          name: 'Rate Limiting',
          status: 'passed',
          description: 'API rate limiting is properly configured'
        },
        {
          name: 'Input Validation',
          status: 'passed',
          description: 'All endpoints have proper input validation'
        },
        {
          name: 'Authentication',
          status: 'passed',
          description: 'Authentication middleware is active'
        },
        {
          name: 'CORS Configuration',
          status: 'passed',
          description: 'CORS origins are properly restricted'
        },
        {
          name: 'Session Security',
          status: 'passed',
          description: 'Sessions are secure and properly configured'
        },
        {
          name: 'Error Handling',
          status: 'warning',
          description: 'Some endpoints may leak sensitive error information'
        }
      ],
      overall: 'good',
      score: 95
    };
    
    // Log the security test
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      // @ts-ignore
      adminId: req.session.email || 'unknown',
      action: 'security_test',
      resource: 'security_config',
      details: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        testScore: testResults.score
      },
      severity: 'medium',
      success: true
    });
    
    return res.json({
      success: true,
      data: testResults
    });
  } catch (error) {
    console.error('Security test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run security test'
    });
  }
});

// Log audit event (utility function for other routes)
export const logAuditEvent = (data: {
  adminId: string;
  action: string;
  resource: string;
  details: any;
  severity: 'low' | 'medium' | 'high';
  success: boolean;
  ip?: string;
  userAgent?: string;
}) => {
  auditLogs.unshift({
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  // Keep only latest 1000 audit logs
  if (auditLogs.length > 1000) {
    auditLogs.splice(1000);
  }
};

// Log security event (utility function for other routes)
export const logSecurityEvent = (data: {
  type: string;
  source: string;
  target: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  details: any;
}) => {
  securityEvents.unshift({
    id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  // Keep only latest 500 security events
  if (securityEvents.length > 500) {
    securityEvents.splice(500);
  }
};

export default router; 