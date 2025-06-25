import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { SystemConfigModel, ISystemConfig } from 'modl-shared-web';

const router = Router();

// Apply authentication to all system routes
router.use(requireAuth);

// Default configuration, used if no config is found in the DB
const defaultConfig = {
  general: {
    systemName: 'modl Admin',
    adminEmail: 'admin@modl.gg',
    timezone: 'UTC',
    defaultLanguage: 'en',
    maintenanceMode: false,
    maintenanceMessage: 'System under maintenance. Please check back later.'
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireTwoFactor: false,
    passwordMinLength: 8,
    passwordRequireSpecial: false,
    ipWhitelist: [],
    corsOrigins: ['https://admin.modl.gg']
  },
  notifications: {
    emailNotifications: true,
    criticalAlerts: true,
    weeklyReports: true,
    maintenanceAlerts: true,
    slackWebhook: '',
    discordWebhook: ''
  },
  performance: {
    cacheTtl: 300,
    rateLimitRequests: 100,
    rateLimitWindow: 60,
    databaseConnectionPool: 10,
    enableCompression: true,
    enableCaching: true
  },
  features: {
    analyticsEnabled: true,
    auditLoggingEnabled: true,
    apiAccessEnabled: true,
    bulkOperationsEnabled: true,
    advancedFiltering: true,
    realTimeUpdates: true
  }
};

// Helper to get or create the main config
async function getMainConfig(): Promise<ISystemConfig> {
  const config = await SystemConfigModel.findOneAndUpdate(
    { configId: 'main_config' },
    { $setOnInsert: { configId: 'main_config', ...defaultConfig } },
    { new: true, upsert: true, runValidators: true }
  );
  return config;
}

// Rate limiting configuration
const configRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased limit for config changes
  message: { error: 'Too many configuration changes' }
});

// Configuration validation schema
const configSchema = z.object({
  general: z.object({
    systemName: z.string().min(1).max(100),
    adminEmail: z.string().email(),
    timezone: z.string(),
    defaultLanguage: z.string(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string()
  }),
  security: z.object({
    sessionTimeout: z.number().min(5).max(1440),
    maxLoginAttempts: z.number().min(1).max(10),
    lockoutDuration: z.number().min(1).max(60),
    requireTwoFactor: z.boolean(),
    passwordMinLength: z.number().min(6).max(32),
    passwordRequireSpecial: z.boolean(),
    ipWhitelist: z.array(z.string()),
    corsOrigins: z.array(z.string())
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    criticalAlerts: z.boolean(),
    weeklyReports: z.boolean(),
    maintenanceAlerts: z.boolean(),
    slackWebhook: z.string().optional(),
    discordWebhook: z.string().optional()
  }),
  performance: z.object({
    cacheTtl: z.number().min(60).max(3600),
    rateLimitRequests: z.number().min(10).max(1000),
    rateLimitWindow: z.number().min(10).max(300),
    databaseConnectionPool: z.number().min(5).max(50),
    enableCompression: z.boolean(),
    enableCaching: z.boolean()
  }),
  features: z.object({
    analyticsEnabled: z.boolean(),
    auditLoggingEnabled: z.boolean(),
    apiAccessEnabled: z.boolean(),
    bulkOperationsEnabled: z.boolean(),
    advancedFiltering: z.boolean(),
    realTimeUpdates: z.boolean()
  })
});

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const config = await getMainConfig();
    return res.json({
      success: true,
      data: config.toObject()
    });
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch configuration' 
    });
  }
});

// Update system configuration
router.put('/config', configRateLimit, async (req, res) => {
  try {
    const validatedConfig = configSchema.parse(req.body);
    
    const updatedConfig = await SystemConfigModel.findOneAndUpdate(
      { configId: 'main_config' },
      { $set: validatedConfig },
      { new: true, upsert: true }
    );
    
    // @ts-ignore
    console.log(`Configuration updated by admin: ${req.session.email}`);
    
    return res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        details: error.errors
      });
    } else {
      console.error('Update config error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update configuration'
      });
    }
  }
});

// Get maintenance status
router.get('/maintenance', async (req, res) => {
  try {
    const config = await getMainConfig();
    return res.json({
      success: true,
      data: {
        isActive: config.general.maintenanceMode,
        message: config.general.maintenanceMessage,
      }
    });
  } catch (error) {
    console.error('Get maintenance status error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch maintenance status' 
    });
  }
});

// Toggle maintenance mode
router.post('/maintenance/toggle', async (req, res) => {
  try {
    const { enabled, message } = req.body;
    
    const update: any = {
      'general.maintenanceMode': enabled
    };

    if (message) {
      update['general.maintenanceMessage'] = message;
    }

    const updatedConfig = await SystemConfigModel.findOneAndUpdate(
        { configId: 'main_config' },
        { $set: update },
        { new: true, upsert: true }
    );
    
    // @ts-ignore
    console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin: ${req.session.email}`);
    
    return res.json({
      success: true,
      data: {
        isActive: updatedConfig.general.maintenanceMode,
        message: updatedConfig.general.maintenanceMessage,
      },
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Toggle maintenance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle maintenance mode'
    });
  }
});

// Restart service (mock implementation)
router.post('/services/:service/restart', async (req, res) => {
  try {
    const { service } = req.params;
    
    // Validate service name
    const validServices = ['API Gateway', 'Database', 'Authentication', 'File Storage', 'Email Service', 'Monitoring'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service name'
      });
    }
    
    // Mock restart process
    // @ts-ignore
    console.log(`Restarting service: ${service} by admin: ${req.session.email}`);
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return res.json({
      success: true,
      message: `Service ${service} restarted successfully`
    });
  } catch (error) {
    console.error('Service restart error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to restart service'
    });
  }
});

// Get rate limit status
router.get('/rate-limits', async (req, res) => {
  try {
    const config = await getMainConfig();
    return res.json({
      success: true,
      data: {
        current: config.performance,
        active: true,
        resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Get rate limits error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch rate limit status' 
    });
  }
});

// Update rate limits
router.put('/rate-limits', configRateLimit, async (req, res) => {
  try {
    const { rateLimitRequests, rateLimitWindow } = req.body;
    
    const update: any = {};
    if (rateLimitRequests) {
      update['performance.rateLimitRequests'] = rateLimitRequests;
    }
    if (rateLimitWindow) {
      update['performance.rateLimitWindow'] = rateLimitWindow;
    }

    const config = await SystemConfigModel.findOneAndUpdate(
      { configId: 'main_config' },
      { $set: update },
      { new: true, upsert: true }
    );
    
    // @ts-ignore
    console.log(`Rate limits updated by admin: ${req.session.email}`);
    
    return res.json({
      success: true,
      data: config.performance,
      message: 'Rate limits updated successfully'
    });
  } catch (error) {
    console.error('Update rate limits error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update rate limits'
    });
  }
});

export default router; 