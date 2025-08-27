import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import winston from 'winston';
import path from 'path';
import * as fs from 'fs';
import { AuthenticationService } from './core/services/AuthenticationService';
import { DatabaseService } from './core/services/DatabaseService';
import { EventBusService } from './core/services/EventBusService';
import { EmailService } from './core/services/EmailService';
import { ExternalAPIService } from './core/services/ExternalAPIService';
import { PluginLoader } from './core/PluginLoader';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import authRoutes from './routes/auth';
import grafanaAuthRoutes from './routes/grafana-auth';
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

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'keystone',
  user: process.env.DB_USER || 'keystone',
  password: process.env.DB_PASSWORD || 'keystone-dev-2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// Global plugin loader instance
let pluginLoader: PluginLoader;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Add metrics middleware
app.use(metricsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Initialize services
const initializeServices = async () => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connected');

    // Initialize core services
    const dbService = DatabaseService.getInstance(
      { 
        postgres: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'keystone',
          user: process.env.DB_USER || 'keystone',
          password: process.env.DB_PASSWORD || 'keystone-dev-2024',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        }, 
        redis: redisConfig 
      },
      logger
    );
    await dbService.initialize();
    
    const eventBus = EventBusService.getInstance(
      dbService,
      {
        maxListeners: 100,
        persistEvents: true,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      logger
    );
    
    const emailService = EmailService.getInstance(
      dbService,
      {
        brevoApiKey: process.env.BREVO_API_KEY || '',
        brevoWebhookSecret: process.env.BREVO_WEBHOOK_SECRET || '',
        defaultFromEmail: process.env.EMAIL_FROM || 'noreply@kevinalthaus.com',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'Keystone Platform',
        webhookUrl: process.env.EMAIL_WEBHOOK_URL || '',
      },
      logger
    );
    
    const externalAPIService = ExternalAPIService.getInstance(
      dbService, 
      eventBus,
      logger,
      process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
    );

    // Initialize auth service
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
    };

    const authService = AuthenticationService.getInstance(
      dbService,
      authConfig,
      logger
    );

    await authService.initialize();
    logger.info('Authentication service initialized');

    // Make services available to routes
    app.set('authService', authService);
    app.set('dbService', dbService);
    app.set('eventBus', eventBus);
    app.set('emailService', emailService);
    app.set('externalAPIService', externalAPIService);
    app.set('logger', logger);

    // Core API Routes (before plugin routes)
    app.use('/auth', authRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/grafana', grafanaAuthRoutes);

    // =================================================================
    // PLUGIN SYSTEM INITIALIZATION AND ROUTE MOUNTING
    // =================================================================
    
    logger.info('Initializing plugin system...');
    
    const pluginsDir = path.join(__dirname, 'plugins');
    
    // Create plugin loader instance
    pluginLoader = new PluginLoader(
      app,
      {
        db: dbService,
        eventBus,
        email: emailService,
        externalAPI: externalAPIService,
      },
      logger,
      pluginsDir
    );

    // Initialize plugin loader (discovers and loads plugins)
    await pluginLoader.initialize();
    
    // Get all enabled plugins and mount their routes correctly
    const allPlugins = await pluginLoader.getAllPlugins();
    
    for (const plugin of allPlugins) {
      if (plugin.isEnabled && plugin.metadata) {
        const pluginName = plugin.name;
        const pluginPath = path.join(pluginsDir, pluginName);
        
        try {
          // Check if plugin has routes defined in metadata
          if (plugin.metadata.routes && plugin.metadata.routes.length > 0) {
            logger.info(`Mounting routes for plugin: ${pluginName}`);
            
            // Load each route file specified in the metadata
            for (const routeFile of plugin.metadata.routes) {
              const routePath = path.join(pluginPath, routeFile);
              
              // Check if route file exists
              if (fs.existsSync(routePath)) {
                // Clear require cache for hot reloading
                delete require.cache[require.resolve(routePath)];
                
                // Load the route module
                const routeModule = require(routePath);
                const router = routeModule.default || routeModule;
                
                // Mount at the correct paths
                // Primary path: /api/{plugin-name}
                app.use(`/api/${pluginName}`, router);
                
                // Also mount at /api/plugins/{plugin-name} for backward compatibility
                app.use(`/api/plugins/${pluginName}`, router);
                
                logger.info(`  - Mounted ${routeFile} at /api/${pluginName} and /api/plugins/${pluginName}`);
              } else {
                logger.warn(`  - Route file not found: ${routePath}`);
              }
            }
          }
          
          // Alternative: Check for a getRouter method (for plugins using the module pattern)
          const indexPath = path.join(pluginPath, 'index.js');
          if (fs.existsSync(indexPath)) {
            delete require.cache[require.resolve(indexPath)];
            const pluginModule = require(indexPath);
            const module = pluginModule.default || pluginModule;
            
            if (module.getRouter && typeof module.getRouter === 'function') {
              const router = module.getRouter();
              
              // Mount at both paths
              app.use(`/api/${pluginName}`, router);
              app.use(`/api/plugins/${pluginName}`, router);
              
              logger.info(`  - Mounted dynamic router at /api/${pluginName} and /api/plugins/${pluginName}`);
            }
          }
        } catch (error) {
          logger.error(`Failed to mount routes for plugin ${pluginName}:`, error);
        }
      }
    }
    
    // Special handling for address-validator plugin (ensure it's always available for testing)
    try {
      const addressValidatorPath = path.join(pluginsDir, 'address-validator');
      if (fs.existsSync(addressValidatorPath)) {
        const manifestPath = path.join(addressValidatorPath, 'manifest.json');
        const pluginJsonPath = path.join(addressValidatorPath, 'plugin.json');
        
        // Try to load metadata from either manifest.json or plugin.json
        let metadata: any = null;
        if (fs.existsSync(manifestPath)) {
          metadata = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } else if (fs.existsSync(pluginJsonPath)) {
          metadata = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
        }
        
        if (metadata && metadata.routes) {
          for (const routeFile of metadata.routes) {
            const routePath = path.join(addressValidatorPath, routeFile);
            if (fs.existsSync(routePath)) {
              delete require.cache[require.resolve(routePath)];
              const routeModule = require(routePath);
              const router = routeModule.default || routeModule;
              
              // Ensure address-validator is accessible at the expected path
              app.use('/api/address-validator', router);
              logger.info('Address validator plugin forcefully mounted at /api/address-validator');
              break;
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Could not force-mount address-validator:', error);
    }
    
    // Make plugin loader available globally
    app.set('pluginLoader', pluginLoader);
    
    // Plugin management API routes
    app.use('/api/plugins', pluginRoutes);
    app.use('/plugins', pluginRoutes);
    
    logger.info('Plugin system initialized successfully');
    
    // Log all mounted routes for debugging
    logger.info('All mounted routes:');
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        logger.info(`  ${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.regexp) {
        const path = middleware.regexp.toString()
          .replace('/^', '')
          .replace('\\/', '/')
          .replace(/\$.*$/, '')
          .replace(/\\/g, '');
        logger.info(`  Router mounted at: ${path || middleware.regexp}`);
      }
    });

    // =================================================================
    // END OF PLUGIN SYSTEM
    // =================================================================

    // 404 handler (must be after all routes)
    app.use((req, res) => {
      logger.warn(`404 Not Found: ${req.method} ${req.path}`);
      res.status(404).json({ 
        error: 'Not Found',
        message: `Route ${req.path} not found`,
        method: req.method 
      });
    });

    // Error handling middleware (must be last)
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
      logger.info(`Plugin system initialized with dynamic route mounting`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Clean up plugins
      if (pluginLoader) {
        try {
          const plugins = await pluginLoader.getAllPlugins();
          for (const plugin of plugins) {
            if (plugin.isEnabled) {
              await pluginLoader.disablePlugin(plugin.name);
            }
          }
          logger.info('All plugins disabled');
        } catch (error) {
          logger.error('Error disabling plugins:', error);
        }
      }

      // Close database connection
      await pool.end();
      logger.info('Database connection closed');
      
      process.exit(0);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the application
initializeServices();

// Export for testing
export default app;
export { pluginLoader };