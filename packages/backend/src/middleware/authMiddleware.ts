import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../core/services/AuthenticationService';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    sessionId: string;
  };
}

/**
 * Authentication middleware - Verifies JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const authService = AuthenticationService.getInstance();
    
    try {
      const payload = await authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Authorization middleware - Checks if user has required permissions
 */
export const authorize = (...requiredPermissions: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authService = AuthenticationService.getInstance();
    
    for (const permission of requiredPermissions) {
      const hasPermission = await authService.hasPermission(req.user.userId, permission);
      if (!hasPermission) {
        res.status(403).json({ 
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`
        });
        return;
      }
    }
    
    next();
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (...requiredRoles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authService = AuthenticationService.getInstance();
    
    for (const role of requiredRoles) {
      const hasRole = await authService.hasRole(req.user.userId, role);
      if (hasRole) {
        next();
        return;
      }
    }
    
    res.status(403).json({ 
      error: 'Forbidden',
      message: `Requires one of these roles: ${requiredRoles.join(', ')}`
    });
  };
};

/**
 * Optional authentication - Attaches user if token is present but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const authService = AuthenticationService.getInstance();
      
      try {
        const payload = await authService.verifyToken(token);
        req.user = payload;
      } catch {
        // Invalid token, but continue without user
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};