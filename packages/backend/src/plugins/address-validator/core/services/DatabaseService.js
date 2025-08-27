"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const pg_1 = require("pg");
const ioredis_1 = require("ioredis");
const eventemitter3_1 = require("eventemitter3");
/**
 * DatabaseService - Manages PostgreSQL/PostGIS and Redis connections
 * Provides connection pooling, caching, and transaction support
 */
class DatabaseService extends eventemitter3_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.pgPool = null;
        this.redisClient = null;
        this.isConnected = false;
        this.config = config;
        this.logger = logger;
    }
    static getInstance(config, logger) {
        if (!DatabaseService.instance) {
            if (!config || !logger) {
                throw new Error('DatabaseService requires config and logger for initialization');
            }
            DatabaseService.instance = new DatabaseService(config, logger);
        }
        return DatabaseService.instance;
    }
    /**
     * Initialize database connections
     */
    async initialize() {
        try {
            // Initialize PostgreSQL connection
            await this.initializePostgreSQL();
            // Initialize Redis connection
            await this.initializeRedis();
            // Enable PostGIS extension
            await this.enablePostGIS();
            this.isConnected = true;
            this.emit('connected');
            this.logger.info('Database services initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize database services', error);
            throw error;
        }
    }
    /**
     * Initialize PostgreSQL connection pool
     */
    async initializePostgreSQL() {
        this.pgPool = new pg_1.Pool({
            ...this.config.postgres,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        // Test connection
        const client = await this.pgPool.connect();
        try {
            await client.query('SELECT NOW()');
            this.logger.info('PostgreSQL connected successfully');
        }
        finally {
            client.release();
        }
        // Handle pool errors
        this.pgPool.on('error', (err) => {
            this.logger.error('Unexpected PostgreSQL pool error', err);
            this.emit('error', err);
        });
    }
    /**
     * Initialize Redis connection
     */
    async initializeRedis() {
        this.redisClient = new ioredis_1.default({
            ...this.config.redis,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        await new Promise((resolve, reject) => {
            this.redisClient.once('ready', () => {
                this.logger.info('Redis connected successfully');
                resolve();
            });
            this.redisClient.once('error', (err) => {
                this.logger.error('Redis connection error', err);
                reject(err);
            });
        });
    }
    /**
     * Enable PostGIS extension for spatial data
     */
    async enablePostGIS() {
        try {
            await this.query('CREATE EXTENSION IF NOT EXISTS postgis');
            await this.query('CREATE EXTENSION IF NOT EXISTS postgis_topology');
            this.logger.info('PostGIS extensions enabled');
        }
        catch (error) {
            this.logger.warn('Could not enable PostGIS extensions', error);
        }
    }
    /**
     * Execute a query with optional caching
     */
    async query(text, params, options = {}) {
        if (!this.pgPool) {
            throw new Error('Database not initialized');
        }
        // Check cache if enabled
        if (options.cache && this.redisClient) {
            const cacheKey = options.cacheKey || this.generateCacheKey(text, params);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for key: ${cacheKey}`);
                return cached;
            }
        }
        // Execute query
        const start = Date.now();
        try {
            const result = await this.pgPool.query(text, params);
            const duration = Date.now() - start;
            this.logger.debug(`Query executed in ${duration}ms`, {
                query: text.substring(0, 100),
                rows: result.rowCount,
            });
            // Cache result if enabled
            if (options.cache && this.redisClient) {
                const cacheKey = options.cacheKey || this.generateCacheKey(text, params);
                await this.setCache(cacheKey, result, options.cacheTTL || 300);
            }
            return result;
        }
        catch (error) {
            this.logger.error('Query execution failed', { error, query: text });
            throw error;
        }
    }
    /**
     * Execute queries within a transaction
     */
    async transaction(callback) {
        if (!this.pgPool) {
            throw new Error('Database not initialized');
        }
        const client = await this.pgPool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get value from Redis cache
     */
    async getFromCache(key) {
        if (!this.redisClient)
            return null;
        try {
            const data = await this.redisClient.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            this.logger.error('Cache get error', { error, key });
            return null;
        }
    }
    /**
     * Set value in Redis cache
     */
    async setCache(key, value, ttl = 300) {
        if (!this.redisClient)
            return;
        try {
            await this.redisClient.setex(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            this.logger.error('Cache set error', { error, key });
        }
    }
    /**
     * Delete from cache
     */
    async deleteFromCache(pattern) {
        if (!this.redisClient)
            return;
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length > 0) {
                await this.redisClient.del(...keys);
            }
        }
        catch (error) {
            this.logger.error('Cache delete error', { error, pattern });
        }
    }
    /**
     * Generate cache key from query and parameters
     */
    generateCacheKey(query, params) {
        const hash = require('crypto')
            .createHash('md5')
            .update(query + JSON.stringify(params || []))
            .digest('hex');
        return `query:${hash}`;
    }
    /**
     * Get PostgreSQL pool for direct access
     */
    getPool() {
        if (!this.pgPool) {
            throw new Error('Database not initialized');
        }
        return this.pgPool;
    }
    /**
     * Get Redis client for direct access
     */
    getRedis() {
        if (!this.redisClient) {
            throw new Error('Redis not initialized');
        }
        return this.redisClient;
    }
    /**
     * Check connection status
     */
    isHealthy() {
        return this.isConnected &&
            this.pgPool !== null &&
            this.redisClient !== null &&
            this.redisClient.status === 'ready';
    }
    /**
     * Gracefully shutdown connections
     */
    async shutdown() {
        this.logger.info('Shutting down database connections...');
        if (this.pgPool) {
            await this.pgPool.end();
            this.pgPool = null;
        }
        if (this.redisClient) {
            this.redisClient.disconnect();
            this.redisClient = null;
        }
        this.isConnected = false;
        this.emit('disconnected');
    }
}
exports.DatabaseService = DatabaseService;
exports.default = DatabaseService;
