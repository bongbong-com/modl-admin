import { Router, Request, Response } from 'express';
import { PipelineStage } from 'mongoose';
import { SystemLogModel, ISystemLog } from '../models/SystemLog';
import { ModlServerModel } from '../models/ModlServer';
import { requireAuth } from '../middleware/authMiddleware';
import { ApiResponse } from '@/types';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/monitoring/dashboard
 * Get dashboard metrics and overview data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get server counts
    const [
      totalServers,
      activeServers,
      pendingServers,
      failedServers
    ] = await Promise.all([
      ModlServerModel.countDocuments(),
      ModlServerModel.countDocuments({ 
        provisioningStatus: 'completed', 
        emailVerified: true 
      }),
      ModlServerModel.countDocuments({ 
        provisioningStatus: { $in: ['pending', 'in-progress'] } 
      }),
      ModlServerModel.countDocuments({ 
        provisioningStatus: 'failed' 
      })
    ]);

    // Get log counts by level for the last 24 hours
    const [
      criticalLogs24h,
      errorLogs24h,
      warningLogs24h,
      totalLogs24h,
      unresolvedCritical,
      unresolvedErrors
    ] = await Promise.all([
      SystemLogModel.countDocuments({ 
        level: 'critical', 
        timestamp: { $gte: oneDayAgo } 
      }),
      SystemLogModel.countDocuments({ 
        level: 'error', 
        timestamp: { $gte: oneDayAgo } 
      }),
      SystemLogModel.countDocuments({ 
        level: 'warning', 
        timestamp: { $gte: oneDayAgo } 
      }),
      SystemLogModel.countDocuments({ 
        timestamp: { $gte: oneDayAgo } 
      }),
      SystemLogModel.countDocuments({ 
        level: 'critical', 
        resolved: false 
      }),
      SystemLogModel.countDocuments({ 
        level: 'error', 
        resolved: false 
      })
    ]);

    // Get recent server registrations (last 7 days)
    const recentServers = await ModlServerModel.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    // Calculate system health score
    const healthScore = calculateSystemHealth({
      totalServers,
      activeServers,
      failedServers,
      criticalLogs24h,
      errorLogs24h,
      unresolvedCritical,
      unresolvedErrors
    });

    // Get log trend data for the last 7 days
    const logTrends = await getLogTrends(oneWeekAgo, now);

    const response: ApiResponse = {
      success: true,
      data: {
        servers: {
          total: totalServers,
          active: activeServers,
          pending: pendingServers,
          failed: failedServers,
          recentRegistrations: recentServers
        },
        logs: {
          last24h: {
            total: totalLogs24h,
            critical: criticalLogs24h,
            error: errorLogs24h,
            warning: warningLogs24h
          },
          unresolved: {
            critical: unresolvedCritical,
            error: unresolvedErrors
          }
        },
        systemHealth: {
          score: healthScore,
          status: healthScore >= 95 ? 'excellent' : 
                  healthScore >= 85 ? 'good' : 
                  healthScore >= 70 ? 'fair' : 'poor'
        },
        trends: logTrends,
        lastUpdated: now
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

/**
 * GET /api/monitoring/logs
 * Get system logs with filtering and pagination
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      source,
      serverId,
      category,
      resolved,
      search,
      startDate,
      endDate,
      sort = 'timestamp',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};
    
    if (level) {
      filter.level = level;
    }
    
    if (source) {
      filter.source = source;
    }
    
    if (serverId) {
      filter.serverId = serverId;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (resolved !== undefined) {
      filter.resolved = resolved === 'true';
    }
    
    if (search) {
      filter.$text = { $search: search as string };
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate as string);
      }
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'desc' ? -1 : 1;

    // Execute queries
    const [logs, total] = await Promise.all([
      SystemLogModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SystemLogModel.countDocuments(filter)
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          level,
          source,
          serverId,
          category,
          resolved,
          search,
          startDate,
          endDate
        }
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

/**
 * POST /api/monitoring/logs
 * Create a new system log entry
 */
router.post('/logs', async (req: Request, res: Response) => {
  try {
    const logData = req.body;
    
    // Validate required fields
    if (!logData.level || !logData.message || !logData.source) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: level, message, source'
      });
    }

    const log = new SystemLogModel({
      ...logData,
      timestamp: new Date()
    });
    
    await log.save();

    return res.status(201).json({
      success: true,
      data: log,
      message: 'Log entry created successfully'
    });
  } catch (error) {
    console.error('Create log error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create log entry'
    });
  }
});

/**
 * GET /api/monitoring/sources
 * Get available log sources for filtering
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await SystemLogModel.distinct('source');
    
    return res.json({
      success: true,
      data: sources.sort()
    });
  } catch (error) {
    console.error('Get log sources error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch log sources'
    });
  }
});

/**
 * PUT /api/monitoring/logs/:id/resolve
 * Mark a log entry as resolved
 */
router.put('/logs/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvedBy } = req.body;
    
    const log = await SystemLogModel.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedBy: resolvedBy || 'admin',
        resolvedAt: new Date()
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log entry not found'
      });
    }

    return res.json({
      success: true,
      data: log,
      message: 'Log entry marked as resolved'
    });
  } catch (error) {
    console.error('Resolve log error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve log entry'
    });
  }
});

/**
 * GET /api/monitoring/sources
 * Get list of available log sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await SystemLogModel.distinct('source');
    const categories = await SystemLogModel.distinct('category');
    
    return res.json({
      success: true,
      data: {
        sources: sources.filter(Boolean),
        categories: categories.filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Get sources error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sources'
    });
  }
});

/**
 * GET /api/monitoring/health
 * Real-time system health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = await performHealthChecks();
    
    const overallStatus = checks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : checks.some(check => check.status === 'critical')
      ? 'critical'
      : 'degraded';

    return res.json({
      success: true,
      data: {
        status: overallStatus,
        checks,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Helper functions

function calculateSystemHealth(metrics: {
  totalServers: number;
  activeServers: number;
  failedServers: number;
  criticalLogs24h: number;
  errorLogs24h: number;
  unresolvedCritical: number;
  unresolvedErrors: number;
}): number {
  let score = 100;
  
  // Penalize for failed servers
  if (metrics.totalServers > 0) {
    const failureRate = metrics.failedServers / metrics.totalServers;
    score -= failureRate * 30;
  }
  
  // Penalize for critical logs
  score -= Math.min(metrics.criticalLogs24h * 5, 25);
  score -= Math.min(metrics.errorLogs24h * 1, 20);
  
  // Heavy penalty for unresolved critical issues
  score -= metrics.unresolvedCritical * 10;
  score -= metrics.unresolvedErrors * 3;
  
  return Math.max(0, Math.round(score));
}

async function getLogTrends(startDate: Date, endDate: Date) {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          level: "$level"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        levels: {
          $push: {
            level: "$_id.level",
            count: "$count"
          }
        },
        total: { $sum: "$count" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];

  return await SystemLogModel.aggregate(pipeline);
}

async function performHealthChecks() {
  const checks = [];
  
  try {
    // Database connectivity check
    const dbCheck = await SystemLogModel.findOne().limit(1);
    checks.push({
      name: 'Database',
      status: 'healthy',
      message: 'Database connection is working',
      responseTime: Date.now()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    checks.push({
      name: 'Database',
      status: 'critical',
      message: 'Database connection failed',
      error: errorMessage
    });
  }
  
  try {
    // Check for recent critical errors
    const recentCritical = await SystemLogModel.countDocuments({
      level: 'critical',
      timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      resolved: false
    });
    
    checks.push({
      name: 'Error Rate',
      status: recentCritical === 0 ? 'healthy' : recentCritical < 5 ? 'degraded' : 'critical',
      message: `${recentCritical} unresolved critical errors in the last hour`,
      count: recentCritical
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    checks.push({
      name: 'Error Rate',
      status: 'unknown',
      message: 'Unable to check error rate',
      error: errorMessage
    });
  }
  
  return checks;
}

export default router; 