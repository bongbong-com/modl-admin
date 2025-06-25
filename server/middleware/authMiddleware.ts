import { Request, Response, NextFunction } from 'express';
import { AdminUserModel } from '../models/AdminUser';

/**
 * Middleware to check if admin is authenticated
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    const mockAdmin = {
      _id: 'dev-admin-id-00000000000000',
      email: 'dev@modl.gg',
      loggedInIps: ['127.0.0.1', '::1', req.ip].filter(Boolean),
      lastActivityAt: new Date(),
      createdAt: new Date(),
    };
    req.adminUser = mockAdmin as any;
    req.session.adminId = mockAdmin._id;
    req.session.email = mockAdmin.email;
    req.session.isAuthenticated = true;
    return next();
  }

  try {
    // Check if session exists and has admin ID
    if (!req.session.adminId || !req.session.isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify admin still exists in database
    const admin = await AdminUserModel.findById(req.session.adminId);
    if (!admin) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    // Check if current IP is in allowed IPs
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!admin.loggedInIps.includes(clientIP)) {
      return res.status(401).json({
        success: false,
        error: 'IP address not authorized'
      });
    }

    // Attach admin to request
    req.adminUser = admin;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication check failed'
    });
  }
};

/**
 * Middleware for optional authentication (doesn't fail if not authenticated)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.session.adminId && req.session.isAuthenticated) {
      const admin = await AdminUserModel.findById(req.session.adminId);
      if (admin) {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        if (admin.loggedInIps.includes(clientIP)) {
          req.adminUser = admin;
        }
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

/**
 * Update admin's last activity and IP if needed
 */
export const updateActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.session.adminId) {
      if (process.env.NODE_ENV === 'development' && req.session.adminId.startsWith('dev-admin-id')) {
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Perform a single update operation
      await AdminUserModel.updateOne(
        { _id: req.session.adminId },
        {
          $set: { lastActivityAt: new Date() },
          $addToSet: { loggedInIps: clientIP } // Add IP only if it doesn't exist
        }
      );
    }
    return next();
  } catch (error) {
    console.error('Update activity middleware error:', error);
    return next(); // Continue despite error
  }
}; 