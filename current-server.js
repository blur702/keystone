"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const winston_1 = __importDefault(require("winston"));
const AuthenticationService_1 = require("./core/services/AuthenticationService");
const ActivityLogger_1 = require("./core/services/ActivityLogger");
const activityLogger_1 = require("./middleware/activityLogger");
const auth_1 = __importDefault(require("./routes/auth"));
const activity_1 = __importDefault(require("./routes/activity"));
const grafanaAuth = require("./routes/grafana-auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Logger setup
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
// Database connection
const pool = new pg_1.Pool({
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
    constructor(pool) {
        this.pool = pool;
    }
    async query(text, params, options) {
        return this.pool.query(text, params);
    }
    async deleteFromCache(pattern) {
        // No-op for minimal MVP (no Redis)
    }
}
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('combined'));
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
        const authService = AuthenticationService_1.AuthenticationService.getInstance(dbService, authConfig, logger);
        await authService.initialize();
        logger.info('Authentication service initialized');
        // Initialize activity logger
        ActivityLogger_1.ActivityLogger.initialize(pool);
        logger.info('Activity logger initialized');
        // Make services available to routes
        app.set('authService', authService);
        app.set('logger', logger);
        app.set('pool', pool);
        // Apply activity logging middleware
        app.use(activityLogger_1.activityLoggerMiddleware);
        // Routes
        app.use('/auth', auth_1.default);
        app.use('/activity-logs', activity_1.default);
        app.use('/grafana', grafanaAuth);
        // Error handling middleware
        app.use((err, req, res, next) => {
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
    }
    catch (error) {
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
exports.default = app;
//# sourceMappingURL=server.js.map
// PLUGIN FIX: Mount plugin routes
try {
  const pluginRoutes = require('./plugin-routes.js');
  app.use('/api/address-validator', pluginRoutes);
  app.use('/api/plugins/address-validator', pluginRoutes);
  console.log('Plugin routes mounted successfully');
} catch (e) {
  console.error('Failed to mount plugin routes:', e.message);
}

// Plugin management endpoints
app.get('/api/plugins', (req, res) => {
  res.json({
    plugins: [{
      id: 'address-validator',
      name: 'Address Validator',
      version: '1.0.0',
      isEnabled: true,
      isInstalled: true
    }]
  });
});

app.get('/plugins', (req, res) => {
  res.json({ message: 'Plugin system is active', count: 1 });
});
