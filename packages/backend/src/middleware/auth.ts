import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../core/services/AuthenticationService';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const authService = req.app.get('authService') as AuthenticationService;
    const decoded = await authService.verifyToken(token);
    
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};