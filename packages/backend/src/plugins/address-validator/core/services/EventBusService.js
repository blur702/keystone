"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
/**
 * EventBusService - Provides decoupled, asynchronous communication between plugins and services
 * Implements event sourcing pattern with persistence and replay capabilities
 */
class EventBusService extends eventemitter3_1.EventEmitter {
    constructor(db, config, logger) {
        super();
        this.handlers = new Map();
        this.eventQueue = [];
        this.processing = false;
        this.stats = {
            totalEvents: 0,
            eventsByType: {},
            eventsBySource: {},
            failedEvents: 0,
            averageProcessingTime: 0,
        };
        this.db = db;
        this.config = config;
        this.logger = logger;
        // EventEmitter3 doesn't have setMaxListeners, but we can track it
        // this.setMaxListeners(config.maxListeners);
        // Start event processor
        this.startEventProcessor();
    }
    static getInstance(db, config, logger) {
        if (!EventBusService.instance) {
            if (!db || !config || !logger) {
                throw new Error('EventBusService requires dependencies for initialization');
            }
            EventBusService.instance = new EventBusService(db, config, logger);
        }
        return EventBusService.instance;
    }
    /**
     * Publish an event
     */
    async publish(type, source, data, metadata) {
        const event = {
            id: (0, uuid_1.v4)(),
            type,
            source,
            data,
            metadata: metadata || {},
            timestamp: new Date(),
            version: '1.0',
        };
        // Add to queue
        this.eventQueue.push(event);
        // Persist event if enabled
        if (this.config.persistEvents) {
            await this.persistEvent(event);
        }
        // Update stats
        this.updateStats(event);
        // Emit for immediate listeners
        this.emit(type, event);
        // Process queue
        if (!this.processing) {
            this.processEventQueue();
        }
        this.logger.debug(`Event published: ${type} from ${source}`);
    }
    /**
     * Subscribe to an event
     */
    subscribe(event, handler, options = {}) {
        const handlerId = (0, uuid_1.v4)();
        const eventHandler = {
            id: handlerId,
            event,
            handler,
            priority: options.priority || 0,
            filter: options.filter,
            once: options.once,
        };
        // Add to handlers map
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        const handlers = this.handlers.get(event);
        handlers.push(eventHandler);
        // Sort by priority (higher priority first)
        handlers.sort((a, b) => b.priority - a.priority);
        // Register with EventEmitter
        const wrappedHandler = async (eventMessage) => {
            // Apply filters
            if (eventHandler.filter) {
                if (eventHandler.filter.source) {
                    const sources = Array.isArray(eventHandler.filter.source)
                        ? eventHandler.filter.source
                        : [eventHandler.filter.source];
                    if (!sources.includes(eventMessage.source)) {
                        return;
                    }
                }
                if (eventHandler.filter.metadata) {
                    const matches = Object.entries(eventHandler.filter.metadata).every(([key, value]) => eventMessage.metadata?.[key] === value);
                    if (!matches) {
                        return;
                    }
                }
                if (eventHandler.filter.condition && !eventHandler.filter.condition(eventMessage)) {
                    return;
                }
            }
            // Execute handler
            try {
                await handler(eventMessage);
                // Remove if once
                if (eventHandler.once) {
                    this.unsubscribe(handlerId);
                }
            }
            catch (error) {
                this.logger.error(`Event handler error for ${event}`, error);
                this.emit('handler:error', { event, error, handlerId });
            }
        };
        if (options.once) {
            this.once(event, wrappedHandler);
        }
        else {
            this.on(event, wrappedHandler);
        }
        // Store subscription if subscriber provided
        if (options.subscriber) {
            this.storeSubscription(handlerId, event, options.subscriber);
        }
        this.logger.debug(`Subscribed to event: ${event} with handler ${handlerId}`);
        return handlerId;
    }
    /**
     * Unsubscribe from an event
     */
    unsubscribe(handlerId) {
        for (const [event, handlers] of this.handlers) {
            const index = handlers.findIndex(h => h.id === handlerId);
            if (index !== -1) {
                handlers.splice(index, 1);
                // Remove from EventEmitter
                // Note: This is simplified - in production you'd need to track the actual listener
                this.logger.debug(`Unsubscribed handler ${handlerId} from event ${event}`);
                return true;
            }
        }
        return false;
    }
    /**
     * Subscribe once to an event
     */
    subscribeOnce(event, handler, options) {
        return this.subscribe(event, handler, { ...options, once: true });
    }
    /**
     * Wait for an event
     */
    async waitFor(event, timeout = 30000, filter) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.unsubscribe(handlerId);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout);
            const handlerId = this.subscribe(event, (eventMessage) => {
                clearTimeout(timer);
                resolve(eventMessage);
            }, { once: true, filter });
        });
    }
    /**
     * Replay events from a specific point in time
     */
    async replayEvents(since, until, filter) {
        try {
            let query = 'SELECT * FROM events WHERE timestamp >= $1';
            const params = [since];
            if (until) {
                query += ' AND timestamp <= $2';
                params.push(until);
            }
            if (filter?.type) {
                query += ` AND type = $${params.length + 1}`;
                params.push(filter.type);
            }
            if (filter?.source) {
                query += ` AND source = $${params.length + 1}`;
                params.push(filter.source);
            }
            query += ' ORDER BY timestamp ASC';
            const result = await this.db.query(query, params);
            for (const event of result.rows) {
                // Re-emit the event
                this.emit(event.type, event);
                // Process through handlers
                const handlers = this.handlers.get(event.type);
                if (handlers) {
                    for (const handler of handlers) {
                        try {
                            await handler.handler(event);
                        }
                        catch (error) {
                            this.logger.error(`Error replaying event ${event.id}`, error);
                        }
                    }
                }
            }
            this.logger.info(`Replayed ${result.rows.length} events`);
        }
        catch (error) {
            this.logger.error('Failed to replay events', error);
            throw error;
        }
    }
    /**
     * Get event statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Clear event statistics
     */
    clearStats() {
        this.stats = {
            totalEvents: 0,
            eventsByType: {},
            eventsBySource: {},
            failedEvents: 0,
            averageProcessingTime: 0,
        };
    }
    /**
     * List all registered event types
     */
    getRegisteredEvents() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Get handlers for an event
     */
    getEventHandlers(event) {
        return this.handlers.get(event) || [];
    }
    /**
     * Process event queue
     */
    async processEventQueue() {
        if (this.processing || this.eventQueue.length === 0) {
            return;
        }
        this.processing = true;
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            try {
                const handlers = this.handlers.get(event.type);
                if (handlers) {
                    const startTime = Date.now();
                    for (const handler of handlers) {
                        try {
                            await this.executeHandlerWithRetry(handler, event);
                        }
                        catch (error) {
                            this.logger.error(`Handler ${handler.id} failed for event ${event.type}`, error);
                            this.stats.failedEvents++;
                        }
                    }
                    // Update average processing time
                    const processingTime = Date.now() - startTime;
                    this.stats.averageProcessingTime =
                        (this.stats.averageProcessingTime * (this.stats.totalEvents - 1) + processingTime) /
                            this.stats.totalEvents;
                }
            }
            catch (error) {
                this.logger.error(`Failed to process event ${event.id}`, error);
            }
        }
        this.processing = false;
    }
    /**
     * Execute handler with retry logic
     */
    async executeHandlerWithRetry(handler, event) {
        let attempts = 0;
        let lastError;
        while (attempts < this.config.retryAttempts) {
            try {
                await handler.handler(event);
                return;
            }
            catch (error) {
                lastError = error;
                attempts++;
                if (attempts < this.config.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempts));
                }
            }
        }
        throw lastError;
    }
    /**
     * Persist event to database
     */
    async persistEvent(event) {
        try {
            await this.db.query(`INSERT INTO events (id, type, source, data, metadata, timestamp, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                event.id,
                event.type,
                event.source,
                JSON.stringify(event.data),
                JSON.stringify(event.metadata),
                event.timestamp,
                event.version,
            ]);
        }
        catch (error) {
            this.logger.error('Failed to persist event', error);
        }
    }
    /**
     * Store subscription in database
     */
    async storeSubscription(handlerId, event, subscriber) {
        try {
            await this.db.query(`INSERT INTO event_subscriptions (id, event, subscriber, created_at)
         VALUES ($1, $2, $3, NOW())`, [handlerId, event, subscriber]);
        }
        catch (error) {
            this.logger.error('Failed to store subscription', error);
        }
    }
    /**
     * Update event statistics
     */
    updateStats(event) {
        this.stats.totalEvents++;
        // Update events by type
        if (!this.stats.eventsByType[event.type]) {
            this.stats.eventsByType[event.type] = 0;
        }
        this.stats.eventsByType[event.type]++;
        // Update events by source
        if (!this.stats.eventsBySource[event.source]) {
            this.stats.eventsBySource[event.source] = 0;
        }
        this.stats.eventsBySource[event.source]++;
    }
    /**
     * Start event processor
     */
    startEventProcessor() {
        setInterval(() => {
            if (!this.processing && this.eventQueue.length > 0) {
                this.processEventQueue();
            }
        }, 100);
    }
    /**
     * Shutdown event bus
     */
    async shutdown() {
        this.logger.info('Shutting down event bus...');
        // Process remaining events
        if (this.eventQueue.length > 0) {
            await this.processEventQueue();
        }
        // Clear handlers
        this.handlers.clear();
        // Remove all listeners
        this.removeAllListeners();
        this.logger.info('Event bus shut down');
    }
}
exports.EventBusService = EventBusService;
// System events
EventBusService.EVENTS = {
    // Plugin events
    PLUGIN_INSTALLED: 'plugin:installed',
    PLUGIN_ENABLED: 'plugin:enabled',
    PLUGIN_DISABLED: 'plugin:disabled',
    PLUGIN_UNINSTALLED: 'plugin:uninstalled',
    PLUGIN_CONFIGURED: 'plugin:configured',
    // User events
    USER_REGISTERED: 'user:registered',
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    USER_UPDATED: 'user:updated',
    USER_DELETED: 'user:deleted',
    // System events
    SYSTEM_STARTUP: 'system:startup',
    SYSTEM_SHUTDOWN: 'system:shutdown',
    SYSTEM_ERROR: 'system:error',
    SYSTEM_HEALTH_CHECK: 'system:health_check',
    // Data events
    DATA_CREATED: 'data:created',
    DATA_UPDATED: 'data:updated',
    DATA_DELETED: 'data:deleted',
    DATA_IMPORTED: 'data:imported',
    DATA_EXPORTED: 'data:exported',
    // Email events
    EMAIL_SENT: 'email:sent',
    EMAIL_RECEIVED: 'email:received',
    EMAIL_BOUNCED: 'email:bounced',
    EMAIL_OPENED: 'email:opened',
    // Custom events prefix
    CUSTOM: 'custom:',
};
exports.default = EventBusService;
