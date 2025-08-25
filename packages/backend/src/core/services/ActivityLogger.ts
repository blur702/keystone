import { Pool } from 'pg';

export interface ActivityLogEntry {
  userId?: number;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure' | 'warning';
  errorMessage?: string;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  public static initialize(pool: Pool): void {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger(pool);
    }
  }

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      throw new Error('ActivityLogger not initialized. Call ActivityLogger.initialize() first.');
    }
    return ActivityLogger.instance;
  }

  public async log(entry: ActivityLogEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO activity_logs (
          user_id, username, action, resource, resource_id, 
          details, ip_address, user_agent, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const values = [
        entry.userId || null,
        entry.username || null,
        entry.action,
        entry.resource || null,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.status || 'success',
        entry.errorMessage || null
      ];

      await this.pool.query(query, values);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  public async getActivityLogs(filters?: {
    userId?: number;
    action?: string;
    resource?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.userId) {
      query += ` AND user_id = $${++paramCount}`;
      values.push(filters.userId);
    }

    if (filters?.action) {
      query += ` AND action = $${++paramCount}`;
      values.push(filters.action);
    }

    if (filters?.resource) {
      query += ` AND resource = $${++paramCount}`;
      values.push(filters.resource);
    }

    if (filters?.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    if (filters?.startDate) {
      query += ` AND created_at >= $${++paramCount}`;
      values.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND created_at <= $${++paramCount}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(filters.offset);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  public async getUserActivitySummary(userId: number, days: number = 30): Promise<any> {
    const query = `
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_activity
      FROM activity_logs
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  public async getSystemActivityStats(days: number = 7): Promise<any> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }
}