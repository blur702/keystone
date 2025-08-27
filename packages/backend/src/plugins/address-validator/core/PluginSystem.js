"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSystem = void 0;
const path = require("path");
const fs = require("fs/promises");
const eventemitter3_1 = require("eventemitter3");
const express_1 = require("express");
const uuid_1 = require("uuid");
/**
 * PluginSystem - Dynamic plugin loader and manager
 * Handles plugin lifecycle, dependency resolution, and integration
 */
class PluginSystem extends eventemitter3_1.EventEmitter {
    constructor(app, services, pluginsPath = path.join(process.cwd(), 'plugins')) {
        super();
        this.plugins = new Map();
        this.hookHandlers = new Map();
        this.app = app;
        this.db = services.database;
        this.eventBus = services.events;
        this.auth = services.auth;
        this.email = services.email;
        this.logger = services.logger;
        this.pluginsPath = pluginsPath;
    }
    static getInstance(app, services, pluginsPath) {
        if (!PluginSystem.instance) {
            if (!app || !services) {
                throw new Error('PluginSystem requires app and services for initialization');
            }
            PluginSystem.instance = new PluginSystem(app, services, pluginsPath);
        }
        return PluginSystem.instance;
    }
    /**
     * Initialize plugin system and load all plugins
     */
    async initialize() {
        try {
            // Ensure plugins directory exists
            await this.ensurePluginsDirectory();
            // Load plugins from database
            const dbPlugins = await this.loadPluginsFromDatabase();
            // Scan plugins directory
            const availablePlugins = await this.scanPluginsDirectory();
            // Sync plugins with database
            await this.syncPlugins(availablePlugins, dbPlugins);
            // Load and initialize enabled plugins
            for (const pluginName of availablePlugins) {
                const dbPlugin = dbPlugins.find(p => p.name === pluginName);
                if (dbPlugin && dbPlugin.status === 'enabled') {
                    await this.loadPlugin(pluginName);
                }
            }
            this.logger.info(`Plugin system initialized with ${this.plugins.size} active plugins`);
        }
        catch (error) {
            this.logger.error('Failed to initialize plugin system', error);
            throw error;
        }
    }
    /**
     * Install a plugin
     */
    async installPlugin(pluginPath) {
        try {
            const manifestPath = path.join(pluginPath, 'plugin.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            // Validate manifest
            this.validateManifest(manifest);
            // Check dependencies
            await this.checkDependencies(manifest);
            // Copy plugin to plugins directory
            const targetPath = path.join(this.pluginsPath, manifest.name);
            await this.copyDirectory(pluginPath, targetPath);
            // Register in database
            await this.db.query(`INSERT INTO plugins (id, name, version, description, author, homepage, repository, status, dependencies, configuration, permissions_required, routes, hooks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (name) DO UPDATE SET
         version = $3, description = $4, updated_at = NOW()`, [
                (0, uuid_1.v4)(),
                manifest.name,
                manifest.version,
                manifest.description,
                manifest.author,
                manifest.homepage,
                manifest.repository,
                'installed',
                JSON.stringify(manifest.dependencies || {}),
                JSON.stringify(manifest.configuration || {}),
                JSON.stringify(manifest.requiredPermissions || []),
                JSON.stringify(manifest.routes || []),
                JSON.stringify(manifest.hooks || []),
            ]);
            this.emit('plugin:installed', manifest.name);
            this.logger.info(`Plugin installed: ${manifest.name}@${manifest.version}`);
        }
        catch (error) {
            this.logger.error('Failed to install plugin', error);
            throw error;
        }
    }
    /**
     * Enable a plugin
     */
    async enablePlugin(pluginName) {
        try {
            if (this.plugins.has(pluginName)) {
                throw new Error(`Plugin ${pluginName} is already enabled`);
            }
            // Load plugin
            await this.loadPlugin(pluginName);
            // Update database
            await this.db.query('UPDATE plugins SET status = $1, enabled_at = NOW() WHERE name = $2', ['enabled', pluginName]);
            this.emit('plugin:enabled', pluginName);
            this.logger.info(`Plugin enabled: ${pluginName}`);
        }
        catch (error) {
            this.logger.error(`Failed to enable plugin ${pluginName}`, error);
            throw error;
        }
    }
    /**
     * Disable a plugin
     */
    async disablePlugin(pluginName) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                throw new Error(`Plugin ${pluginName} is not loaded`);
            }
            // Call plugin cleanup if available
            if (plugin.instance.cleanup) {
                await plugin.instance.cleanup();
            }
            // Remove routes
            if (plugin.router) {
                // Remove from Express app (simplified - needs proper implementation)
                this.app._router.stack = this.app._router.stack.filter((layer) => layer.name !== pluginName);
            }
            // Remove hook handlers
            this.removePluginHooks(pluginName);
            // Remove from active plugins
            this.plugins.delete(pluginName);
            // Update database
            await this.db.query('UPDATE plugins SET status = $1, disabled_at = NOW() WHERE name = $2', ['disabled', pluginName]);
            this.emit('plugin:disabled', pluginName);
            this.logger.info(`Plugin disabled: ${pluginName}`);
        }
        catch (error) {
            this.logger.error(`Failed to disable plugin ${pluginName}`, error);
            throw error;
        }
    }
    /**
     * Uninstall a plugin
     */
    async uninstallPlugin(pluginName) {
        try {
            // Disable if enabled
            if (this.plugins.has(pluginName)) {
                await this.disablePlugin(pluginName);
            }
            // Remove from filesystem
            const pluginPath = path.join(this.pluginsPath, pluginName);
            await fs.rm(pluginPath, { recursive: true, force: true });
            // Remove from database
            await this.db.query('DELETE FROM plugins WHERE name = $1', [pluginName]);
            this.emit('plugin:uninstalled', pluginName);
            this.logger.info(`Plugin uninstalled: ${pluginName}`);
        }
        catch (error) {
            this.logger.error(`Failed to uninstall plugin ${pluginName}`, error);
            throw error;
        }
    }
    /**
     * Get plugin configuration
     */
    async getPluginConfig(pluginName) {
        const result = await this.db.query('SELECT configuration FROM plugins WHERE name = $1', [pluginName]);
        if (result.rows.length === 0) {
            throw new Error(`Plugin ${pluginName} not found`);
        }
        return result.rows[0].configuration;
    }
    /**
     * Update plugin configuration
     */
    async updatePluginConfig(pluginName, config) {
        // Validate config against schema
        const plugin = this.plugins.get(pluginName);
        if (plugin && plugin.manifest.configuration?.schema) {
            // Validate using schema (simplified - use proper validation library)
            this.validateConfig(config, plugin.manifest.configuration.schema);
        }
        // Update database
        await this.db.query('UPDATE plugins SET configuration = $1 WHERE name = $2', [JSON.stringify(config), pluginName]);
        // Reload plugin if active
        if (this.plugins.has(pluginName)) {
            await this.reloadPlugin(pluginName);
        }
        this.emit('plugin:configured', { name: pluginName, config });
        this.logger.info(`Plugin configuration updated: ${pluginName}`);
    }
    /**
     * Get all plugins
     */
    async getAllPlugins() {
        const result = await this.db.query('SELECT * FROM plugins ORDER BY name');
        return result.rows;
    }
    /**
     * Get active plugins
     */
    getActivePlugins() {
        return Array.from(this.plugins.values());
    }
    /**
     * Execute hook
     */
    async executeHook(hookName, data) {
        const handlers = this.hookHandlers.get(hookName) || [];
        const results = [];
        // Sort by priority
        handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const handler of handlers) {
            try {
                const result = await handler.handler(data);
                results.push({ plugin: handler.plugin, result });
            }
            catch (error) {
                this.logger.error(`Hook execution failed for ${handler.plugin}`, error);
            }
        }
        return results;
    }
    /**
     * Load a plugin
     */
    async loadPlugin(pluginName) {
        try {
            const pluginPath = path.join(this.pluginsPath, pluginName);
            const manifestPath = path.join(pluginPath, 'plugin.json');
            // Load manifest
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            // Load configuration from database
            const config = await this.getPluginConfig(pluginName);
            // Create plugin context
            const context = this.createPluginContext(manifest, config);
            // Load plugin module
            const PluginClass = require(path.join(pluginPath, manifest.main));
            const instance = new PluginClass(context);
            // Initialize plugin
            if (instance.initialize) {
                await instance.initialize();
            }
            // Create plugin router
            const router = (0, express_1.Router)();
            // Register routes
            if (manifest.routes) {
                for (const route of manifest.routes) {
                    this.registerPluginRoute(router, route, instance, context);
                }
            }
            // Mount router
            this.app.use(`/api/plugins/${pluginName}`, router);
            // Register hooks
            if (manifest.hooks) {
                for (const hook of manifest.hooks) {
                    this.registerPluginHook(pluginName, hook, instance);
                }
            }
            // Store plugin
            this.plugins.set(pluginName, {
                manifest,
                instance,
                context,
                status: 'enabled',
                router,
            });
            this.logger.info(`Plugin loaded: ${pluginName}`);
        }
        catch (error) {
            this.logger.error(`Failed to load plugin ${pluginName}`, error);
            // Mark as error in database
            await this.db.query('UPDATE plugins SET status = $1 WHERE name = $2', ['error', pluginName]);
            throw error;
        }
    }
    /**
     * Reload a plugin
     */
    async reloadPlugin(pluginName) {
        await this.disablePlugin(pluginName);
        await this.enablePlugin(pluginName);
    }
    /**
     * Create plugin context
     */
    createPluginContext(manifest, config) {
        const pluginLogger = this.logger.child({ plugin: manifest.name });
        const api = {
            registerRoute: (route) => {
                // Dynamic route registration
                this.logger.info(`Plugin ${manifest.name} registered route: ${route.path}`);
            },
            registerHook: (hook) => {
                // Dynamic hook registration
                this.logger.info(`Plugin ${manifest.name} registered hook: ${hook.event}`);
            },
            getConfig: (key) => config[key],
            setConfig: async (key, value) => {
                config[key] = value;
                await this.updatePluginConfig(manifest.name, config);
            },
            emit: async (event, data) => {
                await this.eventBus.publish(`plugin:${manifest.name}:${event}`, manifest.name, data);
            },
            on: (event, handler) => {
                this.eventBus.subscribe(event, handler, { subscriber: manifest.name });
            },
            log: (level, message, meta) => {
                pluginLogger.log(level, message, meta);
            },
        };
        return {
            id: (0, uuid_1.v4)(),
            name: manifest.name,
            version: manifest.version,
            config,
            services: {
                database: this.db,
                events: this.eventBus,
                auth: this.auth,
                email: this.email,
                logger: pluginLogger,
            },
            api,
        };
    }
    /**
     * Register plugin route
     */
    registerPluginRoute(router, route, instance, context) {
        const handler = instance[route.handler];
        if (!handler) {
            throw new Error(`Handler ${route.handler} not found in plugin ${context.name}`);
        }
        // Build middleware chain
        const middlewares = [];
        // Add permission check if required
        if (route.permissions) {
            middlewares.push(async (req, res, next) => {
                const user = req.user;
                if (!user) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                for (const permission of route.permissions) {
                    const hasPermission = await this.auth.hasPermission(user.id, permission);
                    if (!hasPermission) {
                        return res.status(403).json({ error: 'Forbidden' });
                    }
                }
                next();
            });
        }
        // Add custom middleware
        if (route.middleware) {
            for (const middlewareName of route.middleware) {
                const middleware = instance[middlewareName];
                if (middleware) {
                    middlewares.push(middleware.bind(instance));
                }
            }
        }
        // Add route handler
        middlewares.push(handler.bind(instance));
        // Register route
        router[route.method.toLowerCase()](route.path, ...middlewares);
    }
    /**
     * Register plugin hook
     */
    registerPluginHook(pluginName, hook, instance) {
        const handler = instance[hook.handler];
        if (!handler) {
            throw new Error(`Handler ${hook.handler} not found in plugin ${pluginName}`);
        }
        if (!this.hookHandlers.has(hook.event)) {
            this.hookHandlers.set(hook.event, []);
        }
        this.hookHandlers.get(hook.event).push({
            plugin: pluginName,
            handler: handler.bind(instance),
            priority: hook.priority || 0,
        });
    }
    /**
     * Remove plugin hooks
     */
    removePluginHooks(pluginName) {
        for (const [event, handlers] of this.hookHandlers) {
            const filtered = handlers.filter(h => h.plugin !== pluginName);
            if (filtered.length === 0) {
                this.hookHandlers.delete(event);
            }
            else {
                this.hookHandlers.set(event, filtered);
            }
        }
    }
    /**
     * Validate plugin manifest
     */
    validateManifest(manifest) {
        if (!manifest.name || !manifest.version || !manifest.main) {
            throw new Error('Invalid plugin manifest: missing required fields');
        }
        if (!/^[a-z0-9-]+$/.test(manifest.name)) {
            throw new Error('Invalid plugin name: must be lowercase alphanumeric with hyphens');
        }
    }
    /**
     * Validate configuration
     */
    validateConfig(config, schema) {
        // Implement proper JSON schema validation
        // This is a simplified version
        for (const [key, value] of Object.entries(schema)) {
            if (value.required && !(key in config)) {
                throw new Error(`Missing required configuration: ${key}`);
            }
        }
    }
    /**
     * Check plugin dependencies
     */
    async checkDependencies(manifest) {
        if (!manifest.dependencies)
            return;
        for (const [dep, version] of Object.entries(manifest.dependencies)) {
            const plugin = await this.db.query('SELECT version FROM plugins WHERE name = $1 AND status != $2', [dep, 'error']);
            if (plugin.rows.length === 0) {
                throw new Error(`Missing dependency: ${dep}`);
            }
            // Check version compatibility (simplified)
            // In production, use proper semver comparison
        }
    }
    /**
     * Ensure plugins directory exists
     */
    async ensurePluginsDirectory() {
        try {
            await fs.access(this.pluginsPath);
        }
        catch {
            await fs.mkdir(this.pluginsPath, { recursive: true });
        }
    }
    /**
     * Scan plugins directory
     */
    async scanPluginsDirectory() {
        try {
            const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        }
        catch {
            return [];
        }
    }
    /**
     * Load plugins from database
     */
    async loadPluginsFromDatabase() {
        const result = await this.db.query('SELECT * FROM plugins');
        return result.rows;
    }
    /**
     * Sync plugins between filesystem and database
     */
    async syncPlugins(available, dbPlugins) {
        // Mark missing plugins as error
        for (const dbPlugin of dbPlugins) {
            if (!available.includes(dbPlugin.name) && dbPlugin.status !== 'error') {
                await this.db.query('UPDATE plugins SET status = $1 WHERE name = $2', ['error', dbPlugin.name]);
            }
        }
    }
    /**
     * Copy directory recursively
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            }
            else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }
}
exports.PluginSystem = PluginSystem;
exports.default = PluginSystem;
