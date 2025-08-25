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

// Register endpoint
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService, logger } = getServices(req);
    const { email, username, password, first_name, last_name } = req.body;

    // Validation
    if (!email || !username || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await authService.register({
      email,
      username,
      password,
      first_name,
      last_name
    });

    logger.info(`User registered: ${email}`);
    res.status(201).json({ user });
  } catch (error: any) {
    next(error);
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService, logger } = getServices(req);
    const { email, username, password } = req.body;

    // Accept either email or username
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    const result = await authService.login({
      email: email || username,  // Pass either email or username
      password,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    logger.info(`User logged in: ${email || username}`);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService } = getServices(req);
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(error);
  }
});

// Verify token middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { authService } = getServices(req);
    const payload = await authService.verifyToken(token);
    
    (req as any).user = payload;
    next();
  } catch (error: any) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Protected route example - Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService, logger } = getServices(req);
    const { sessionId } = (req as any).user;

    await authService.logout(sessionId);
    
    logger.info(`User logged out: session ${sessionId}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Check permission endpoint
router.post('/check-permission', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authService } = getServices(req);
    const { permission } = req.body;
    const { userId } = (req as any).user;

    if (!permission) {
      return res.status(400).json({ error: 'Permission is required' });
    }

    const hasPermission = await authService.hasPermission(userId, permission);
    res.json({ hasPermission });
  } catch (error) {
    next(error);
  }
});

export default router;