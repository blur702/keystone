import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import winston from 'winston';
import { AuthenticationService } from './core/services/AuthenticationService';
import { DatabaseService } from './core/services/DatabaseService';
import { EmailService } from './core/services/EmailService';
import { EventBusService } from './core/services/EventBusService';
import { ExternalAPIService } from './core/services/ExternalAPIService';
import { PluginLoader } from './core/PluginLoader';
import authRoutes from './routes/auth';
import pluginRoutes from './routes/plugins';

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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Health check
app.get('/health', async (req, res) => {
  try {
    const services = {
      api: 'healthy',
      database: 'unknown',
      redis: 'unknown',
      timestamp: new Date().toISOString()
    };

    // Check database health
    const dbService = app.get('dbService') as DatabaseService;
    if (dbService && dbService.isHealthy()) {
      services.database = 'healthy';
      services.redis = 'healthy'; // Redis is part of DatabaseService
    }

    res.json(services);
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: 'Service check failed',
      timestamp: new Date().toISOString() 
    });
  }
});

// Initialize services
const initializeServices = async () => {
  try {
    // Database configuration
    const dbConfig = {
      postgres: {
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'keystone',
        user: process.env.DB_USER || 'keystone',
        password: process.env.DB_PASSWORD || 'keystone',
      },
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      }
    };

    // Initialize DatabaseService
    const dbService = DatabaseService.getInstance(dbConfig, logger);
    await dbService.initialize();
    logger.info('Database service initialized');

    // Initialize EventBusService
    const eventBusConfig = {
      maxListeners: 100,
      persistEvents: true,
      retryAttempts: 3,
      retryDelay: 1000,
    };
    const eventBus = EventBusService.getInstance(dbService, eventBusConfig, logger);
    logger.info('Event bus service initialized');

    // Initialize EmailService
    const emailConfig = {
      brevoApiKey: process.env.BREVO_API_KEY || '',
      brevoWebhookSecret: process.env.BREVO_WEBHOOK_SECRET || '',
      defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@keystone.local',
      defaultFromName: process.env.DEFAULT_FROM_NAME || 'Keystone Platform',
      webhookUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/webhooks/email`,
    };
    const emailService = EmailService.getInstance(dbService, emailConfig, logger);
    logger.info('Email service initialized');

    // Initialize ExternalAPIService
    const externalAPI = ExternalAPIService.getInstance(
      dbService,
      eventBus,
      logger,
      process.env.ENCRYPTION_KEY || 'default-encryption-key'
    );
    await externalAPI.initialize();
    logger.info('External API service initialized');

    // Initialize AuthenticationService
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'),
    };
    const authService = AuthenticationService.getInstance(dbService, authConfig, logger);
    await authService.initialize();
    logger.info('Authentication service initialized');

    // Initialize PluginLoader
    const pluginLoader = new PluginLoader(
      app,
      { db: dbService, eventBus, email: emailService, externalAPI },
      logger
    );
    await pluginLoader.initialize();
    logger.info('Plugin loader initialized');

    // Make services available to routes
    app.set('dbService', dbService);
    app.set('authService', authService);
    app.set('emailService', emailService);
    app.set('eventBus', eventBus);
    app.set('externalAPI', externalAPI);
    app.set('pluginLoader', pluginLoader);
    app.set('logger', logger);

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/plugins', pluginRoutes);

    // Email webhook endpoint
    app.post('/api/webhooks/email', async (req, res) => {
      try {
        const signature = req.headers['x-brevo-signature'] as string;
        await emailService.processWebhook(req.body, signature);
        res.status(200).send('OK');
      } catch (error) {
        logger.error('Email webhook processing failed', error);
        res.status(400).send('Bad Request');
      }
    });

    // Metrics endpoint for Prometheus
    app.get('/metrics', (req, res) => {
      // In production, you'd use a proper metrics library like prom-client
      res.type('text/plain');
      res.send(`
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total{method="GET",status="200"} 1000
api_requests_total{method="POST",status="200"} 500

# HELP api_request_duration_seconds API request duration in seconds
# TYPE api_request_duration_seconds histogram
api_request_duration_seconds_bucket{le="0.1"} 900
api_request_duration_seconds_bucket{le="0.5"} 950
api_request_duration_seconds_bucket{le="1"} 980
api_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP database_connections_active Active database connections
# TYPE database_connections_active gauge
database_connections_active 10

# HELP memory_usage_bytes Memory usage in bytes
# TYPE memory_usage_bytes gauge
memory_usage_bytes ${process.memoryUsage().heapUsed}
      `);
    });

    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Error:', err);
      
      // Send error to monitoring
      eventBus.publish(
        EventBusService.EVENTS.SYSTEM_ERROR,
        'API',
        { error: err.message, stack: err.stack, url: req.url }
      );

      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      
      // Emit system startup event
      eventBus.publish(
        EventBusService.EVENTS.SYSTEM_STARTUP,
        'Server',
        { port: PORT, environment: process.env.NODE_ENV }
      );
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Emit shutdown event
      await eventBus.publish(
        EventBusService.EVENTS.SYSTEM_SHUTDOWN,
        'Server',
        { signal, timestamp: new Date() }
      );

      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Shutdown services
      await eventBus.shutdown();
      await dbService.shutdown();

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the application
initializeServices();

export default app;