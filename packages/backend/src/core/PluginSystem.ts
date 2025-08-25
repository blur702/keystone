import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'eventemitter3';
import winston from 'winston';
import { DatabaseService } from './services/DatabaseService';
import { EventBusService } from './services/EventBusService';
import { AuthenticationService } from './services/AuthenticationService';
import { EmailService } from './services/EmailService';
import { Express, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  main: string;
  dependencies?: Record<string, string>;
  requiredPermissions?: string[];
  routes?: PluginRoute[];
  hooks?: PluginHook[];
  configuration?: PluginConfiguration;
  ui?: PluginUI;
}

export interface PluginRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
  permissions?: string[];
}

export interface PluginHook {
  event: string;
  handler: string;
  priority?: number;
}

export interface PluginConfiguration {
  schema: Record<string, any>;
  defaults: Record<string, any>;
  ui?: {
    component: string;
    route: string;
  };
}

export interface PluginUI {
  adminComponents?: {
    name: string;
    component: string;
    route: string;
    menuItem?: {
      label: string;
      icon?: string;
      order?: number;
    };
  }[];
  publicComponents?: {
    name: string;
    component: string;
    route: string;
  }[];
}

export interface PluginContext {
  id: string;
  name: string;
  version: string;
  config: Record<string, any>;
  services: {
    database: DatabaseService;
    events: EventBusService;
    auth: AuthenticationService;
    email: EmailService;
    logger: winston.Logger;
  };
  api: PluginAPI;
}

export interface PluginAPI {
  registerRoute(route: PluginRoute): void;
  registerHook(hook: PluginHook): void;
  getConfig(key: string): any;
  setConfig(key: string, value: any): Promise<void>;
  emit(event: string, data: any): Promise<void>;
  on(event: string, handler: Function): void;
  log(level: string, message: string, meta?: any): void;
}

export interface Plugin {
  manifest: PluginManifest;
  instance: any;
  context: PluginContext;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  router?: Router;
}

/**
 * PluginSystem - Dynamic plugin loader and manager
 * Handles plugin lifecycle, dependency resolution, and integration
 */
export class PluginSystem extends EventEmitter {
  private static instance: PluginSystem;
  private plugins: Map<string, Plugin> = new Map();
  private pluginsPath: string;
  private app: Express;
  private db: DatabaseService;
  private eventBus: EventBusService;
  private auth: AuthenticationService;
  private email: EmailService;
  private logger: winston.Logger;
  private hookHandlers: Map<string, Array<{ plugin: string; handler: Function; priority: number }>> = new Map();

  private constructor(
    app: Express,
    services: {
      database: DatabaseService;
      events: EventBusService;
      auth: AuthenticationService;
      email: EmailService;
      logger: winston.Logger;
    },
    pluginsPath: string = path.join(process.cwd(), 'plugins')
  ) {
    super();
    this.app = app;
    this.db = services.database;
    this.eventBus = services.events;
    this.auth = services.auth;
    this.email = services.email;
    this.logger = services.logger;
    this.pluginsPath = pluginsPath;
  }

  public static getInstance(
    app?: Express,
    services?: any,
    pluginsPath?: string
  ): PluginSystem {
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
  public async initialize(): Promise<void> {
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
    } catch (error) {
      this.logger.error('Failed to initialize plugin system', error);
      throw error;
    }
  }

  /**
   * Install a plugin
   */
  public async installPlugin(pluginPath: string): Promise<void> {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate manifest
      this.validateManifest(manifest);

      // Check dependencies
      await this.checkDependencies(manifest);

      // Copy plugin to plugins directory
      const targetPath = path.join(this.pluginsPath, manifest.name);
      await this.copyDirectory(pluginPath, targetPath);

      // Register in database
      await this.db.query(
        `INSERT INTO plugins (id, name, version, description, author, homepage, repository, status, dependencies, configuration, permissions_required, routes, hooks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (name) DO UPDATE SET
         version = $3, description = $4, updated_at = NOW()`,
        [
          uuidv4(),
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
        ]
      );

      this.emit('plugin:installed', manifest.name);
      this.logger.info(`Plugin installed: ${manifest.name}@${manifest.version}`);
    } catch (error) {
      this.logger.error('Failed to install plugin', error);
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  public async enablePlugin(pluginName: string): Promise<void> {
    try {
      if (this.plugins.has(pluginName)) {
        throw new Error(`Plugin ${pluginName} is already enabled`);
      }

      // Load plugin
      await this.loadPlugin(pluginName);

      // Update database
      await this.db.query(
        'UPDATE plugins SET status = $1, enabled_at = NOW() WHERE name = $2',
        ['enabled', pluginName]
      );

      this.emit('plugin:enabled', pluginName);
      this.logger.info(`Plugin enabled: ${pluginName}`);
    } catch (error) {
      this.logger.error(`Failed to enable plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  public async disablePlugin(pluginName: string): Promise<void> {
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
        this.app._router.stack = this.app._router.stack.filter(
          (layer: any) => layer.name !== pluginName
        );
      }

      // Remove hook handlers
      this.removePluginHooks(pluginName);

      // Remove from active plugins
      this.plugins.delete(pluginName);

      // Update database
      await this.db.query(
        'UPDATE plugins SET status = $1, disabled_at = NOW() WHERE name = $2',
        ['disabled', pluginName]
      );

      this.emit('plugin:disabled', pluginName);
      this.logger.info(`Plugin disabled: ${pluginName}`);
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  public async uninstallPlugin(pluginName: string): Promise<void> {
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
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Get plugin configuration
   */
  public async getPluginConfig(pluginName: string): Promise<Record<string, any>> {
    const result = await this.db.query(
      'SELECT configuration FROM plugins WHERE name = $1',
      [pluginName]
    );

    if (result.rows.length === 0) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    return result.rows[0].configuration;
  }

  /**
   * Update plugin configuration
   */
  public async updatePluginConfig(
    pluginName: string,
    config: Record<string, any>
  ): Promise<void> {
    // Validate config against schema
    const plugin = this.plugins.get(pluginName);
    if (plugin && plugin.manifest.configuration?.schema) {
      // Validate using schema (simplified - use proper validation library)
      this.validateConfig(config, plugin.manifest.configuration.schema);
    }

    // Update database
    await this.db.query(
      'UPDATE plugins SET configuration = $1 WHERE name = $2',
      [JSON.stringify(config), pluginName]
    );

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
  public async getAllPlugins(): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM plugins ORDER BY name');
    return result.rows;
  }

  /**
   * Get active plugins
   */
  public getActivePlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute hook
   */
  public async executeHook(hookName: string, data: any): Promise<any[]> {
    const handlers = this.hookHandlers.get(hookName) || [];
    const results: any[] = [];

    // Sort by priority
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const handler of handlers) {
      try {
        const result = await handler.handler(data);
        results.push({ plugin: handler.plugin, result });
      } catch (error) {
        this.logger.error(`Hook execution failed for ${handler.plugin}`, error);
      }
    }

    return results;
  }

  /**
   * Load a plugin
   */
  private async loadPlugin(pluginName: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsPath, pluginName);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      // Load manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

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
      const router = Router();

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
    } catch (error) {
      this.logger.error(`Failed to load plugin ${pluginName}`, error);
      
      // Mark as error in database
      await this.db.query(
        'UPDATE plugins SET status = $1 WHERE name = $2',
        ['error', pluginName]
      );

      throw error;
    }
  }

  /**
   * Reload a plugin
   */
  private async reloadPlugin(pluginName: string): Promise<void> {
    await this.disablePlugin(pluginName);
    await this.enablePlugin(pluginName);
  }

  /**
   * Create plugin context
   */
  private createPluginContext(
    manifest: PluginManifest,
    config: Record<string, any>
  ): PluginContext {
    const pluginLogger = this.logger.child({ plugin: manifest.name });

    const api: PluginAPI = {
      registerRoute: (route: PluginRoute) => {
        // Dynamic route registration
        this.logger.info(`Plugin ${manifest.name} registered route: ${route.path}`);
      },
      registerHook: (hook: PluginHook) => {
        // Dynamic hook registration
        this.logger.info(`Plugin ${manifest.name} registered hook: ${hook.event}`);
      },
      getConfig: (key: string) => config[key],
      setConfig: async (key: string, value: any) => {
        config[key] = value;
        await this.updatePluginConfig(manifest.name, config);
      },
      emit: async (event: string, data: any) => {
        await this.eventBus.publish(`plugin:${manifest.name}:${event}`, manifest.name, data);
      },
      on: (event: string, handler: Function) => {
        this.eventBus.subscribe(event, handler as any, { subscriber: manifest.name });
      },
      log: (level: string, message: string, meta?: any) => {
        pluginLogger.log(level, message, meta);
      },
    };

    return {
      id: uuidv4(),
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
  private registerPluginRoute(
    router: Router,
    route: PluginRoute,
    instance: any,
    context: PluginContext
  ): void {
    const handler = instance[route.handler];
    if (!handler) {
      throw new Error(`Handler ${route.handler} not found in plugin ${context.name}`);
    }

    // Build middleware chain
    const middlewares: any[] = [];

    // Add permission check if required
    if (route.permissions) {
      middlewares.push(async (req: any, res: any, next: any) => {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        for (const permission of route.permissions!) {
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
    router[route.method.toLowerCase() as any](route.path, ...middlewares);
  }

  /**
   * Register plugin hook
   */
  private registerPluginHook(
    pluginName: string,
    hook: PluginHook,
    instance: any
  ): void {
    const handler = instance[hook.handler];
    if (!handler) {
      throw new Error(`Handler ${hook.handler} not found in plugin ${pluginName}`);
    }

    if (!this.hookHandlers.has(hook.event)) {
      this.hookHandlers.set(hook.event, []);
    }

    this.hookHandlers.get(hook.event)!.push({
      plugin: pluginName,
      handler: handler.bind(instance),
      priority: hook.priority || 0,
    });
  }

  /**
   * Remove plugin hooks
   */
  private removePluginHooks(pluginName: string): void {
    for (const [event, handlers] of this.hookHandlers) {
      const filtered = handlers.filter(h => h.plugin !== pluginName);
      if (filtered.length === 0) {
        this.hookHandlers.delete(event);
      } else {
        this.hookHandlers.set(event, filtered);
      }
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
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
  private validateConfig(config: any, schema: any): void {
    // Implement proper JSON schema validation
    // This is a simplified version
    for (const [key, value] of Object.entries(schema)) {
      if ((value as any).required && !(key in config)) {
        throw new Error(`Missing required configuration: ${key}`);
      }
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies) return;

    for (const [dep, version] of Object.entries(manifest.dependencies)) {
      const plugin = await this.db.query(
        'SELECT version FROM plugins WHERE name = $1 AND status != $2',
        [dep, 'error']
      );

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
  private async ensurePluginsDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginsPath);
    } catch {
      await fs.mkdir(this.pluginsPath, { recursive: true });
    }
  }

  /**
   * Scan plugins directory
   */
  private async scanPluginsDirectory(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [];
    }
  }

  /**
   * Load plugins from database
   */
  private async loadPluginsFromDatabase(): Promise<any[]> {
    const result = await this.db.query('SELECT * FROM plugins');
    return result.rows;
  }

  /**
   * Sync plugins between filesystem and database
   */
  private async syncPlugins(available: string[], dbPlugins: any[]): Promise<void> {
    // Mark missing plugins as error
    for (const dbPlugin of dbPlugins) {
      if (!available.includes(dbPlugin.name) && dbPlugin.status !== 'error') {
        await this.db.query(
          'UPDATE plugins SET status = $1 WHERE name = $2',
          ['error', dbPlugin.name]
        );
      }
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

export default PluginSystem;