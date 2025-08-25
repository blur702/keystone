import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import winston from 'winston';
import { AuthenticationService } from './core/services/AuthenticationService';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'keystone',
  user: process.env.DB_USER || 'keystone',
  password: process.env.DB_PASSWORD || 'keystone',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simplified DatabaseService for minimal MVP
class SimpleDatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async query<T = any>(text: string, params?: any[], options?: any) {
    return this.pool.query<T>(text, params);
  }

  async deleteFromCache(pattern: string) {
    // No-op for minimal MVP (no Redis)
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connected');

    // Initialize auth service
    const dbService = new SimpleDatabaseService(pool);
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
    };

    const authService = AuthenticationService.getInstance(
      dbService as any,
      authConfig,
      logger
    );

    await authService.initialize();
    logger.info('Authentication service initialized');

    // Make auth service available to routes
    app.set('authService', authService);
    app.set('logger', logger);

    // Routes
    app.use('/auth', authRoutes);

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the application
initializeServices();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

export default app;