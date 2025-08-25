import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../core/services/AuthenticationService';
import winston from 'winston';

const router = Router();

// Middleware to get services from app
const getServices = (req: Request) => {
  const authService = req.app.get('authService') as AuthenticationService;
  const logger = req.app.get('logger') as winston.Logger;
  return { authService, logger };
};

// Grafana auth proxy endpoint
router.get('/auth/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService, logger } = getServices(req);
    
    // Get token from Authorization header or X-Auth-Token
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    const token = authHeader && typeof authHeader === 'string' 
      ? authHeader.replace('Bearer ', '') 
      : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token and get user info
    const payload = await authService.verifyToken(token);
    const user = await authService.getUserById(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user has analytics permission
    const hasAnalyticsAccess = await authService.hasPermission(user.id, 'analytics:view');
    const isAdmin = await authService.hasRole(user.id, 'admin') || await authService.hasRole(user.id, 'super_admin');
    
    if (!hasAnalyticsAccess && !isAdmin) {
      return res.status(403).json({ error: 'No analytics access' });
    }

    // Set headers for Grafana auth proxy
    res.set({
      'X-WEBAUTH-USER': user.username,
      'X-WEBAUTH-NAME': `${user.first_name} ${user.last_name}`,
      'X-WEBAUTH-EMAIL': user.email,
      'X-WEBAUTH-ROLE': isAdmin ? 'Admin' : 'Viewer'
    });

    logger.debug(`Grafana auth verified for user: ${user.email}`);
    
    res.json({ 
      authenticated: true,
      user: {
        username: user.username,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: isAdmin ? 'Admin' : 'Viewer'
      }
    });
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;