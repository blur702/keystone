import { Router, Request, Response } from 'express';
import { ActivityLogger } from '../core/services/ActivityLogger';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    roles?: string[];
    permissions?: string[];
  };
}

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const logger = ActivityLogger.getInstance();
    
    const filters: any = {};
    
    if (req.query.userId) {
      filters.userId = parseInt(req.query.userId as string);
    }
    
    if (req.query.action) {
      filters.action = req.query.action as string;
    }
    
    if (req.query.resource) {
      filters.resource = req.query.resource as string;
    }
    
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    
    filters.limit = parseInt(req.query.limit as string) || 100;
    filters.offset = parseInt(req.query.offset as string) || 0;

    const logs = await logger.getActivityLogs(filters);
    
    res.json({
      data: logs,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.get('/user/:userId/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const logger = ActivityLogger.getInstance();
    const userId = parseInt(req.params.userId);
    const days = parseInt(req.query.days as string) || 30;
    
    const summary = await logger.getUserActivitySummary(userId, days);
    
    res.json({
      userId,
      period: `${days} days`,
      activities: summary
    });
  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch user activity summary' });
  }
});

router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const logger = ActivityLogger.getInstance();
    const days = parseInt(req.query.days as string) || 7;
    
    const stats = await logger.getSystemActivityStats(days);
    
    res.json({
      period: `${days} days`,
      stats
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

export default router;