import { Request, Response, NextFunction } from 'express';
import { ActivityLogger } from '../core/services/ActivityLogger';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
  };
}

const ACTION_MAP: Record<string, string> = {
  'POST /auth/login': 'user.login',
  'POST /auth/logout': 'user.logout',
  'POST /auth/register': 'user.register',
  'POST /auth/refresh': 'token.refresh',
  'GET /users': 'users.list',
  'GET /users/:id': 'users.view',
  'POST /users': 'users.create',
  'PUT /users/:id': 'users.update',
  'DELETE /users/:id': 'users.delete',
  'GET /roles': 'roles.list',
  'POST /roles': 'roles.create',
  'PUT /roles/:id': 'roles.update',
  'DELETE /roles/:id': 'roles.delete',
  'GET /settings': 'settings.view',
  'PUT /settings': 'settings.update',
  'GET /activity-logs': 'activity.view',
};

function getAction(method: string, path: string): string {
  const routePattern = `${method} ${path}`;
  
  for (const [pattern, action] of Object.entries(ACTION_MAP)) {
    const regex = pattern.replace(/:[^/]+/g, '[^/]+');
    if (new RegExp(`^${regex}$`).test(routePattern)) {
      return action;
    }
  }
  
  return `${method.toLowerCase()}.${path.replace(/\//g, '.')}`;
}

function getResource(path: string): string | undefined {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[0];
  }
  return undefined;
}

function getResourceId(path: string): number | undefined {
  const match = path.match(/\/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

export function activityLoggerMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;

  let responseBody: any;

  res.send = function(data: any) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    responseBody = data;
    return originalJson.call(this, data);
  };

  res.on('finish', async () => {
    try {
      const logger = ActivityLogger.getInstance();
      const duration = Date.now() - startTime;
      const action = getAction(req.method, req.path);
      const resource = getResource(req.path);
      const resourceId = getResourceId(req.path);

      const details: Record<string, any> = {
        method: req.method,
        path: req.path,
        query: req.query,
        duration,
        statusCode: res.statusCode,
      };

      if (req.method === 'POST' || req.method === 'PUT') {
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.password_hash;
        delete sanitizedBody.token;
        delete sanitizedBody.refreshToken;
        details.requestBody = sanitizedBody;
      }

      await logger.log({
        userId: req.user?.id,
        username: req.user?.username || req.user?.email,
        action,
        resource,
        resourceId,
        details,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure',
        errorMessage: res.statusCode >= 400 ? responseBody?.error || 'Request failed' : undefined,
      });
    } catch (error) {
      console.error('Activity logging failed:', error);
    }
  });

  next();
}