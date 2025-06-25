import { Router, Request, Response } from 'express';
import { ModlServerModel } from '../models/ModlServer';
import { requireAuth } from '../middleware/authMiddleware';
import { ApiResponse, ModlServer } from '@/types';
import mongoose from 'mongoose';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/servers
 * Get all servers with pagination and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      plan,
      status,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};
    
    if (search) {
      filter.$text = { $search: search as string };
    }
    
    if (plan && plan !== 'all') {
      filter.plan = plan;
    }
    
    if (status) {
      switch (status) {
        case 'active':
          filter.provisioningStatus = 'completed';
          filter.emailVerified = true;
          break;
        case 'pending':
          filter.provisioningStatus = { $in: ['pending', 'in-progress'] };
          break;
        case 'failed':
          filter.provisioningStatus = 'failed';
          break;
        case 'unverified':
          filter.emailVerified = false;
          break;
      }
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'desc' ? -1 : 1;

    // Execute queries
    const [servers, total] = await Promise.all([
      ModlServerModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ModlServerModel.countDocuments(filter)
    ]);

    const response: ApiResponse<{
      servers: ModlServer[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        servers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    };

    return res.json(response);
  } catch (error) {
    console.error('Get servers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch servers'
    });
  }
});

/**
 * GET /api/servers/:id
 * Get a specific server by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const server = await ModlServerModel.findById(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    return res.json({
      success: true,
      data: server
    });
  } catch (error) {
    console.error('Get server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch server'
    });
  }
});

/**
 * GET /api/servers/:id/stats
 * Get server statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const server = await ModlServerModel.findById(id).lean();
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    if (!server.databaseName) {
      return res.status(400).json({
        success: false,
        error: 'Server database not configured'
      });
    }

    // Connect to the specific server's database
    const serverDb = mongoose.connection.useDb(server.databaseName, { useCache: true });
    
    // Fetch stats from the server's database
    const [
      totalPlayers,
      totalTickets,
      totalLogs,
      dbStats
    ] = await Promise.allSettled([
      serverDb.collection('players').countDocuments(),
      serverDb.collection('tickets').countDocuments(),
      serverDb.collection('logs').countDocuments(),
      serverDb.db?.stats()
    ]);

    const getValue = (result: PromiseSettledResult<any>) => result.status === 'fulfilled' ? result.value : 0;

    const stats = {
      totalPlayers: getValue(totalPlayers),
      totalTickets: getValue(totalTickets),
      totalLogs: getValue(totalLogs),
      lastActivity: server.lastActivityAt || server.updatedAt,
      databaseSize: getValue(dbStats)?.storageSize || 0,
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get server stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch server statistics'
    });
  }
});

/**
 * PUT /api/servers/:id
 * Update a server
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    
    const server = await ModlServerModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    return res.json({
      success: true,
      data: server,
      message: 'Server updated successfully'
    });
  } catch (error) {
    console.error('Update server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update server'
    });
  }
});

/**
 * DELETE /api/servers/:id
 * Delete a server
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const server = await ModlServerModel.findByIdAndDelete(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    return res.json({
      success: true,
      message: 'Server deleted successfully'
    });
  } catch (error) {
    console.error('Delete server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete server'
    });
  }
});

/**
 * POST /api/servers
 * Create a new server
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const serverData = req.body;
    
    // Validate required fields
    if (!serverData.serverName || !serverData.customDomain || !serverData.adminEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: serverName, customDomain, adminEmail'
      });
    }

    const server = new ModlServerModel(serverData);
    await server.save();

    return res.status(201).json({
      success: true,
      data: server,
      message: 'Server created successfully'
    });
  } catch (error) {
    console.error('Create server error:', error);
    
    if (typeof error === 'object' && error && 'code' in error && (error as any).code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Server name or domain already exists'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create server'
    });
  }
});

/**
 * POST /api/servers/bulk
 * Perform bulk operations on servers
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { action, serverIds, parameters } = req.body;

    if (!action || !serverIds || !Array.isArray(serverIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, serverIds'
      });
    }

    const updatedAt = new Date();
    let result;
    let affectedCount = 0;

    switch (action) {
      case 'delete':
        result = await ModlServerModel.deleteMany({
          _id: { $in: serverIds }
        });
        affectedCount = result.deletedCount;
        break;
        
      case 'suspend':
        result = await ModlServerModel.updateMany(
          { _id: { $in: serverIds } },
          { 
            provisioningStatus: 'failed',
            updatedAt 
          }
        );
        affectedCount = result.modifiedCount;
        break;
        
      case 'activate':
        result = await ModlServerModel.updateMany(
          { _id: { $in: serverIds } },
          { 
            provisioningStatus: 'completed',
            emailVerified: true,
            updatedAt 
          }
        );
        affectedCount = result.modifiedCount;
        break;
        
      case 'update-plan':
        if (!parameters?.plan) {
          return res.status(400).json({
            success: false,
            error: 'Plan parameter required for update-plan action'
          });
        }
        result = await ModlServerModel.updateMany(
          { _id: { $in: serverIds } },
          { 
            plan: parameters.plan,
            updatedAt 
          }
        );
        affectedCount = result.modifiedCount;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    return res.json({
      success: true,
      data: {
        action,
        affectedCount,
        serverIds
      },
      message: `Bulk operation '${action}' completed successfully`
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Bulk operation failed'
    });
  }
});

export default router; 