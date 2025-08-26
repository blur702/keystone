import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import winston from 'winston';
import { DatabaseService } from './DatabaseService';
import { EventBusService } from './EventBusService';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface APIKeyConfig {
  id: string;
  name: string;
  provider: string;
  key: string;
  secret?: string;
  metadata?: Record<string, any>;
  rateLimit?: {
    requests: number;
    period: number; // in seconds
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIRequest {
  id: string;
  provider: string;
  endpoint: string;
  method: string;
  params?: any;
  headers?: Record<string, string>;
  data?: any;
  timestamp: Date;
}

export interface APIResponse {
  requestId: string;
  status: number;
  data: any;
  headers: Record<string, string>;
  duration: number;
  timestamp: Date;
}

export interface APIUsageStats {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: Date;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * ExternalAPIService - Secure proxy service for managing external API integrations
 * Provides centralized API key management, rate limiting, and usage tracking
 */
export class ExternalAPIService {
  private static instance: ExternalAPIService;
  private db: DatabaseService;
  private eventBus: EventBusService;
  private logger: winston.Logger;
  private apiKeys: Map<string, APIKeyConfig> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private providers: Map<string, AxiosInstance> = new Map();
  private encryptionKey: string;

  // Supported API providers
  public static readonly PROVIDERS = {
    GOOGLE_MAPS: 'google_maps',
    GOOGLE_PLACES: 'google_places',
    GOOGLE_GEOCODING: 'google_geocoding',
    OPENWEATHER: 'openweather',
    STRIPE: 'stripe',
    TWILIO: 'twilio',
    AWS: 'aws',
    AZURE: 'azure',
    SENDGRID: 'sendgrid',
    MAPBOX: 'mapbox',
    CUSTOM: 'custom',
  };

  private constructor(
    db: DatabaseService,
    eventBus: EventBusService,
    logger: winston.Logger,
    encryptionKey: string
  ) {
    this.db = db;
    this.eventBus = eventBus;
    this.logger = logger;
    this.encryptionKey = encryptionKey;
  }

  public static getInstance(
    db?: DatabaseService,
    eventBus?: EventBusService,
    logger?: winston.Logger,
    encryptionKey?: string
  ): ExternalAPIService {
    if (!ExternalAPIService.instance) {
      if (!db || !eventBus || !logger || !encryptionKey) {
        throw new Error('ExternalAPIService requires dependencies for initialization');
      }
      ExternalAPIService.instance = new ExternalAPIService(db, eventBus, logger, encryptionKey);
    }
    return ExternalAPIService.instance;
  }

  /**
   * Initialize service and load API keys from database
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadAPIKeys();
      this.initializeProviders();
      
      // Start rate limit cleanup
      this.startRateLimitCleanup();
      
      this.logger.info('External API service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize External API service', error);
      throw error;
    }
  }

  /**
   * Register a new API key
   */
  public async registerAPIKey(config: Omit<APIKeyConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = uuidv4();
      const encryptedKey = this.encryptKey(config.key);
      const encryptedSecret = config.secret ? this.encryptKey(config.secret) : null;

      await this.db.query(
        `INSERT INTO api_keys (id, name, provider, encrypted_key, encrypted_secret, metadata, rate_limit, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          config.name,
          config.provider,
          encryptedKey,
          encryptedSecret,
          JSON.stringify(config.metadata || {}),
          JSON.stringify(config.rateLimit || null),
          config.isActive !== false,
        ]
      );

      const apiKey: APIKeyConfig = {
        id,
        ...config,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.apiKeys.set(config.provider, apiKey);
      this.initializeProvider(config.provider, apiKey);

      await this.eventBus.publish(
        'api_key:registered',
        'ExternalAPIService',
        { provider: config.provider, name: config.name }
      );

      this.logger.info(`API key registered for provider: ${config.provider}`);
      return id;
    } catch (error) {
      this.logger.error('Failed to register API key', error);
      throw error;
    }
  }

  /**
   * Make an API request through the proxy
   */
  public async request(
    provider: string,
    config: AxiosRequestConfig,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      retry?: number;
    } = {}
  ): Promise<APIResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // Check if provider is configured
      const apiKey = this.apiKeys.get(provider);
      if (!apiKey) {
        throw new Error(`API key not configured for provider: ${provider}`);
      }

      if (!apiKey.isActive) {
        throw new Error(`API key is disabled for provider: ${provider}`);
      }

      // Check rate limits
      if (!(await this.checkRateLimit(provider, apiKey))) {
        throw new Error(`Rate limit exceeded for provider: ${provider}`);
      }

      // Check cache if enabled
      if (options.cache) {
        const cacheKey = this.generateCacheKey(provider, config);
        const cached = await this.db.getFromCache(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for ${provider} API request`);
          return cached as APIResponse;
        }
      }

      // Get provider client
      const client = this.providers.get(provider);
      if (!client) {
        throw new Error(`Provider not initialized: ${provider}`);
      }

      // Log request
      await this.logRequest({
        id: requestId,
        provider,
        endpoint: config.url || '',
        method: config.method || 'GET',
        params: config.params,
        headers: config.headers as Record<string, string> | undefined,
        data: config.data,
        timestamp: new Date(),
      });

      // Make request with retry logic
      let response;
      let attempts = 0;
      const maxRetries = options.retry || 1;

      while (attempts < maxRetries) {
        try {
          response = await client.request(config);
          break;
        } catch (error: any) {
          attempts++;
          if (attempts >= maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      if (!response) {
        throw new Error('Request failed after retries');
      }

      const duration = Date.now() - startTime;

      const apiResponse: APIResponse = {
        requestId,
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
        duration,
        timestamp: new Date(),
      };

      // Cache response if enabled
      if (options.cache) {
        const cacheKey = this.generateCacheKey(provider, config);
        await this.db.setCache(cacheKey, apiResponse, options.cacheTTL || 300);
      }

      // Log response
      await this.logResponse(apiResponse, provider);

      // Emit event
      await this.eventBus.publish(
        'api:request_completed',
        'ExternalAPIService',
        {
          provider,
          requestId,
          duration,
          status: response.status,
        }
      );

      return apiResponse;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await this.logError(requestId, provider, error, duration);
      
      await this.eventBus.publish(
        'api:request_failed',
        'ExternalAPIService',
        {
          provider,
          requestId,
          error: error.message,
          duration,
        }
      );

      throw error;
    }
  }

  /**
   * Get API usage statistics
   */
  public async getUsageStats(provider?: string): Promise<APIUsageStats[]> {
    try {
      let query = `
        SELECT 
          provider,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status >= 400 THEN 1 END) as failed_requests,
          AVG(duration) as average_response_time,
          MAX(timestamp) as last_used
        FROM api_requests
      `;

      const params: any[] = [];
      if (provider) {
        query += ' WHERE provider = $1';
        params.push(provider);
      }

      query += ' GROUP BY provider';

      const result = await this.db.query<any>(query, params);

      return result.rows.map(row => ({
        provider: row.provider,
        totalRequests: parseInt(row.total_requests),
        successfulRequests: parseInt(row.successful_requests),
        failedRequests: parseInt(row.failed_requests),
        averageResponseTime: parseFloat(row.average_response_time) || 0,
        lastUsed: new Date(row.last_used),
      }));
    } catch (error) {
      this.logger.error('Failed to get usage statistics', error);
      throw error;
    }
  }

  /**
   * Update API key
   */
  public async updateAPIKey(
    provider: string,
    updates: Partial<Pick<APIKeyConfig, 'key' | 'secret' | 'metadata' | 'rateLimit' | 'isActive'>>
  ): Promise<void> {
    try {
      const apiKey = this.apiKeys.get(provider);
      if (!apiKey) {
        throw new Error(`API key not found for provider: ${provider}`);
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.key) {
        updateFields.push(`encrypted_key = $${paramCount++}`);
        values.push(this.encryptKey(updates.key));
        apiKey.key = updates.key;
      }

      if (updates.secret) {
        updateFields.push(`encrypted_secret = $${paramCount++}`);
        values.push(this.encryptKey(updates.secret));
        apiKey.secret = updates.secret;
      }

      if (updates.metadata) {
        updateFields.push(`metadata = $${paramCount++}`);
        values.push(JSON.stringify(updates.metadata));
        apiKey.metadata = updates.metadata;
      }

      if (updates.rateLimit) {
        updateFields.push(`rate_limit = $${paramCount++}`);
        values.push(JSON.stringify(updates.rateLimit));
        apiKey.rateLimit = updates.rateLimit;
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
        apiKey.isActive = updates.isActive;
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        values.push(provider);
        
        await this.db.query(
          `UPDATE api_keys SET ${updateFields.join(', ')} WHERE provider = $${paramCount}`,
          values
        );

        apiKey.updatedAt = new Date();
        
        // Reinitialize provider if key changed
        if (updates.key || updates.secret) {
          this.initializeProvider(provider, apiKey);
        }

        this.logger.info(`API key updated for provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to update API key', error);
      throw error;
    }
  }

  /**
   * Delete API key
   */
  public async deleteAPIKey(provider: string): Promise<void> {
    try {
      await this.db.query('DELETE FROM api_keys WHERE provider = $1', [provider]);
      
      this.apiKeys.delete(provider);
      this.providers.delete(provider);
      this.rateLimits.delete(provider);

      await this.eventBus.publish(
        'api_key:deleted',
        'ExternalAPIService',
        { provider }
      );

      this.logger.info(`API key deleted for provider: ${provider}`);
    } catch (error) {
      this.logger.error('Failed to delete API key', error);
      throw error;
    }
  }

  /**
   * Load API keys from database
   */
  private async loadAPIKeys(): Promise<void> {
    try {
      const result = await this.db.query<any>(
        'SELECT * FROM api_keys WHERE is_active = true'
      );

      for (const row of result.rows) {
        const apiKey: APIKeyConfig = {
          id: row.id,
          name: row.name,
          provider: row.provider,
          key: this.decryptKey(row.encrypted_key),
          secret: row.encrypted_secret ? this.decryptKey(row.encrypted_secret) : undefined,
          metadata: row.metadata,
          rateLimit: row.rate_limit,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        this.apiKeys.set(row.provider, apiKey);
      }

      this.logger.info(`Loaded ${this.apiKeys.size} API keys`);
    } catch (error) {
      this.logger.error('Failed to load API keys', error);
      // Don't throw - service can still work with manually added keys
    }
  }

  /**
   * Initialize provider clients
   */
  private initializeProviders(): void {
    for (const [provider, apiKey] of this.apiKeys) {
      this.initializeProvider(provider, apiKey);
    }
  }

  /**
   * Initialize a specific provider
   */
  private initializeProvider(provider: string, apiKey: APIKeyConfig): void {
    let client: AxiosInstance;

    switch (provider) {
      case ExternalAPIService.PROVIDERS.GOOGLE_MAPS:
      case ExternalAPIService.PROVIDERS.GOOGLE_PLACES:
      case ExternalAPIService.PROVIDERS.GOOGLE_GEOCODING:
        client = axios.create({
          baseURL: 'https://maps.googleapis.com/maps/api',
          params: { key: apiKey.key },
        });
        break;

      case ExternalAPIService.PROVIDERS.OPENWEATHER:
        client = axios.create({
          baseURL: 'https://api.openweathermap.org/data/2.5',
          params: { appid: apiKey.key },
        });
        break;

      case ExternalAPIService.PROVIDERS.STRIPE:
        client = axios.create({
          baseURL: 'https://api.stripe.com/v1',
          headers: { Authorization: `Bearer ${apiKey.key}` },
        });
        break;

      case ExternalAPIService.PROVIDERS.TWILIO:
        client = axios.create({
          baseURL: `https://api.twilio.com/2010-04-01/Accounts/${apiKey.key}`,
          auth: {
            username: apiKey.key,
            password: apiKey.secret || '',
          },
        });
        break;

      case ExternalAPIService.PROVIDERS.SENDGRID:
        client = axios.create({
          baseURL: 'https://api.sendgrid.com/v3',
          headers: { Authorization: `Bearer ${apiKey.key}` },
        });
        break;

      case ExternalAPIService.PROVIDERS.MAPBOX:
        client = axios.create({
          baseURL: 'https://api.mapbox.com',
          params: { access_token: apiKey.key },
        });
        break;

      default:
        // Custom provider
        client = axios.create({
          baseURL: apiKey.metadata?.baseURL || '',
          headers: apiKey.metadata?.headers || {},
        });
        break;
    }

    this.providers.set(provider, client);
    this.logger.debug(`Provider initialized: ${provider}`);
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(provider: string, apiKey: APIKeyConfig): Promise<boolean> {
    if (!apiKey.rateLimit) {
      return true;
    }

    const now = Date.now();
    const limitInfo = this.rateLimits.get(provider);

    if (!limitInfo || now > limitInfo.resetTime) {
      // Reset rate limit
      this.rateLimits.set(provider, {
        count: 1,
        resetTime: now + (apiKey.rateLimit.period * 1000),
      });
      return true;
    }

    if (limitInfo.count >= apiKey.rateLimit.requests) {
      return false;
    }

    limitInfo.count++;
    return true;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(provider: string, config: AxiosRequestConfig): string {
    const hash = crypto.createHash('md5')
      .update(`${provider}:${config.method}:${config.url}:${JSON.stringify(config.params)}:${JSON.stringify(config.data)}`)
      .digest('hex');
    return `api:${provider}:${hash}`;
  }

  /**
   * Encrypt API key
   */
  private encryptKey(key: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt API key
   */
  private decryptKey(encryptedKey: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Log API request
   */
  private async logRequest(request: APIRequest): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO api_requests (id, provider, endpoint, method, params, headers, data, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          request.id,
          request.provider,
          request.endpoint,
          request.method,
          JSON.stringify(request.params),
          JSON.stringify(request.headers),
          JSON.stringify(request.data),
          request.timestamp,
        ]
      );
    } catch (error) {
      this.logger.error('Failed to log API request', error);
    }
  }

  /**
   * Log API response
   */
  private async logResponse(response: APIResponse, provider: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE api_requests 
         SET status = $1, response_data = $2, response_headers = $3, duration = $4
         WHERE id = $5`,
        [
          response.status,
          JSON.stringify(response.data).substring(0, 10000), // Limit response size
          JSON.stringify(response.headers),
          response.duration,
          response.requestId,
        ]
      );
    } catch (error) {
      this.logger.error('Failed to log API response', error);
    }
  }

  /**
   * Log API error
   */
  private async logError(requestId: string, provider: string, error: any, duration: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE api_requests 
         SET status = $1, error = $2, duration = $3
         WHERE id = $4`,
        [
          error.response?.status || 0,
          JSON.stringify({
            message: error.message,
            code: error.code,
            response: error.response?.data,
          }),
          duration,
          requestId,
        ]
      );
    } catch (dbError) {
      this.logger.error('Failed to log API error', dbError);
    }
  }

  /**
   * Start rate limit cleanup interval
   */
  private startRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [provider, limitInfo] of this.rateLimits) {
        if (now > limitInfo.resetTime) {
          this.rateLimits.delete(provider);
        }
      }
    }, 60000); // Clean up every minute
  }
}

export default ExternalAPIService;