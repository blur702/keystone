import { Express, Router } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import winston from 'winston';
import { DatabaseService } from './services/DatabaseService';
import { EventBusService } from './services/EventBusService';
import { EmailService } from './services/EmailService';
import { ExternalAPIService } from './services/ExternalAPIService';
import { v4 as uuidv4 } from 'uuid';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  permissions?: string[];
  routes?: string[];
  hooks?: string[];
  configuration?: PluginConfiguration[];
}

export interface PluginConfiguration {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  isEnabled: boolean;
  isInstalled: boolean;
  configuration: Record<string, any>;
  metadata: PluginMetadata;
  installedAt?: Date;
  updatedAt?: Date;
}

export interface PluginContext {
  db: DatabaseService;
  eventBus: EventBusService;
  email: EmailService;
  externalAPI: ExternalAPIService;
  logger: winston.Logger;
  config: Record<string, any>;
}

export interface PluginModule {
  metadata: PluginMetadata;
  initialize: (context: PluginContext) => Promise<void>;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  uninstall?: () => Promise<void>;
  getRouter?: () => Router;
  handleEvent?: (event: string, data: any) => Promise<void>;
}

/**
 * PluginLoader - Dynamic plugin loading and management system
 * Handles plugin discovery, installation, activation, and lifecycle management
 */
export class PluginLoader {
  private app: Express;
  private db: DatabaseService;
  private eventBus: EventBusService;
  private email: EmailService;
  private externalAPI: ExternalAPIService;
  private logger: winston.Logger;
  private pluginsDir: string;
  private plugins: Map<string, PluginModule> = new Map();
  private pluginData: Map<string, Plugin> = new Map();
  private pluginRouters: Map<string, Router> = new Map();

  constructor(
    app: Express,
    services: {
      db: DatabaseService;
      eventBus: EventBusService;
      email: EmailService;
      externalAPI: ExternalAPIService;
    },
    logger: winston.Logger,
    pluginsDir: string = path.join(__dirname, '../plugins')
  ) {
    this.app = app;
    this.db = services.db;
    this.eventBus = services.eventBus;
    this.email = services.email;
    this.externalAPI = services.externalAPI;
    this.logger = logger;
    this.pluginsDir = pluginsDir;
  }

  /**
   * Initialize plugin loader and load all plugins
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure plugins directory exists
      await this.ensurePluginsDirectory();

      // Load plugin data from database
      await this.loadPluginData();

      // Discover plugins in filesystem
      await this.discoverPlugins();

      // Load and activate enabled plugins
      await this.loadEnabledPlugins();

      // Register event handlers
      this.registerEventHandlers();

      this.logger.info(`Plugin loader initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Failed to initialize plugin loader', error);
      throw error;
    }
  }

  /**
   * Get all plugins with their status
   */
  public async getAllPlugins(): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    // Get all discovered plugins
    const discoveredPlugins = await this.discoverPlugins();

    for (const pluginName of discoveredPlugins) {
      const pluginPath = path.join(this.pluginsDir, pluginName);
      
      try {
        // Load plugin metadata
        const metadata = await this.loadPluginMetadata(pluginPath);
        
        // Get plugin data from database
        const dbPlugin = this.pluginData.get(pluginName);
        
        plugins.push({
          id: dbPlugin?.id || '',
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
          author: metadata.author,
          isEnabled: dbPlugin?.isEnabled || false,
          isInstalled: !!dbPlugin,
          configuration: dbPlugin?.configuration || {},
          metadata,
          installedAt: dbPlugin?.installedAt,
          updatedAt: dbPlugin?.updatedAt,
        });
      } catch (error) {
        this.logger.error(`Failed to load plugin metadata for ${pluginName}`, error);
      }
    }

    return plugins;
  }

  /**
   * Install a plugin
   */
  public async installPlugin(pluginName: string): Promise<void> {
    try {
      // Check if plugin exists
      const pluginPath = path.join(this.pluginsDir, pluginName);
      const exists = await this.pluginExists(pluginPath);
      
      if (!exists) {
        throw new Error(`Plugin ${pluginName} not found`);
      }

      // Check if already installed
      if (this.pluginData.has(pluginName)) {
        throw new Error(`Plugin ${pluginName} is already installed`);
      }

      // Load plugin metadata
      const metadata = await this.loadPluginMetadata(pluginPath);

      // Check dependencies
      await this.checkDependencies(metadata);

      // Store in database
      const pluginId = uuidv4();
      await this.db.query(
        `INSERT INTO plugins (id, name, version, description, author, is_enabled, is_installed, configuration, metadata, installed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          pluginId,
          metadata.name,
          metadata.version,
          metadata.description,
          metadata.author,
          false, // Start disabled
          true,
          JSON.stringify({}),
          JSON.stringify(metadata),
        ]
      );

      // Add to plugin data
      const plugin: Plugin = {
        id: pluginId,
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        author: metadata.author,
        isEnabled: false,
        isInstalled: true,
        configuration: {},
        metadata,
        installedAt: new Date(),
        updatedAt: new Date(),
      };

      this.pluginData.set(pluginName, plugin);

      // Load plugin module
      const module = await this.loadPluginModule(pluginPath);
      this.plugins.set(pluginName, module);

      // Initialize plugin
      const context = this.createPluginContext(plugin);
      await module.initialize(context);

      // Run install hook if available
      if (module.uninstall) {
        // Note: This is actually the install hook - naming to be fixed
      }

      await this.eventBus.publish(
        EventBusService.EVENTS.PLUGIN_INSTALLED,
        'PluginLoader',
        { plugin: pluginName, version: metadata.version }
      );

      this.logger.info(`Plugin ${pluginName} installed successfully`);
    } catch (error) {
      this.logger.error(`Failed to install plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  public async uninstallPlugin(pluginName: string): Promise<void> {
    try {
      const plugin = this.pluginData.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} is not installed`);
      }

      // Disable first if enabled
      if (plugin.isEnabled) {
        await this.disablePlugin(pluginName);
      }

      // Run uninstall hook if available
      const module = this.plugins.get(pluginName);
      if (module?.uninstall) {
        await module.uninstall();
      }

      // Remove from database
      await this.db.query('DELETE FROM plugins WHERE name = $1', [pluginName]);

      // Remove from memory
      this.pluginData.delete(pluginName);
      this.plugins.delete(pluginName);

      await this.eventBus.publish(
        EventBusService.EVENTS.PLUGIN_UNINSTALLED,
        'PluginLoader',
        { plugin: pluginName }
      );

      this.logger.info(`Plugin ${pluginName} uninstalled successfully`);
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  public async enablePlugin(pluginName: string): Promise<void> {
    try {
      const plugin = this.pluginData.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} is not installed`);
      }

      if (plugin.isEnabled) {
        throw new Error(`Plugin ${pluginName} is already enabled`);
      }

      const module = this.plugins.get(pluginName);
      if (!module) {
        throw new Error(`Plugin ${pluginName} module not loaded`);
      }

      // Activate plugin
      await module.activate();

      // Register routes if available
      if (module.getRouter) {
        const router = module.getRouter();
        this.app.use(`/api/plugins/${pluginName}`, router);
        this.pluginRouters.set(pluginName, router);
      }

      // Update database
      await this.db.query(
        'UPDATE plugins SET is_enabled = true, updated_at = NOW() WHERE name = $1',
        [pluginName]
      );

      plugin.isEnabled = true;
      plugin.updatedAt = new Date();

      await this.eventBus.publish(
        EventBusService.EVENTS.PLUGIN_ENABLED,
        'PluginLoader',
        { plugin: pluginName }
      );

      this.logger.info(`Plugin ${pluginName} enabled successfully`);
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
      const plugin = this.pluginData.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} is not installed`);
      }

      if (!plugin.isEnabled) {
        throw new Error(`Plugin ${pluginName} is already disabled`);
      }

      const module = this.plugins.get(pluginName);
      if (!module) {
        throw new Error(`Plugin ${pluginName} module not loaded`);
      }

      // Deactivate plugin
      await module.deactivate();

      // Unregister routes
      const router = this.pluginRouters.get(pluginName);
      if (router) {
        // Note: Express doesn't have a built-in way to remove routes
        // In production, you might need to restart the server or use a more sophisticated routing system
        this.pluginRouters.delete(pluginName);
      }

      // Update database
      await this.db.query(
        'UPDATE plugins SET is_enabled = false, updated_at = NOW() WHERE name = $1',
        [pluginName]
      );

      plugin.isEnabled = false;
      plugin.updatedAt = new Date();

      await this.eventBus.publish(
        EventBusService.EVENTS.PLUGIN_DISABLED,
        'PluginLoader',
        { plugin: pluginName }
      );

      this.logger.info(`Plugin ${pluginName} disabled successfully`);
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginName}`, error);
      throw error;
    }
  }

  /**
   * Update plugin configuration
   */
  public async updatePluginConfig(pluginName: string, config: Record<string, any>): Promise<void> {
    try {
      const plugin = this.pluginData.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} is not installed`);
      }

      // Validate configuration
      this.validateConfiguration(plugin.metadata, config);

      // Update database
      await this.db.query(
        'UPDATE plugins SET configuration = $1, updated_at = NOW() WHERE name = $2',
        [JSON.stringify(config), pluginName]
      );

      plugin.configuration = config;
      plugin.updatedAt = new Date();

      // Reload plugin if enabled
      if (plugin.isEnabled) {
        await this.reloadPlugin(pluginName);
      }

      await this.eventBus.publish(
        EventBusService.EVENTS.PLUGIN_CONFIGURED,
        'PluginLoader',
        { plugin: pluginName, config }
      );

      this.logger.info(`Plugin ${pluginName} configuration updated`);
    } catch (error) {
      this.logger.error(`Failed to update plugin ${pluginName} configuration`, error);
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
   * Ensure plugins directory exists
   */
  private async ensurePluginsDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginsDir);
    } catch {
      await fs.mkdir(this.pluginsDir, { recursive: true });
      this.logger.info(`Created plugins directory: ${this.pluginsDir}`);
    }
  }

  /**
   * Load plugin data from database
   */
  private async loadPluginData(): Promise<void> {
    try {
      const result = await this.db.query<any>('SELECT * FROM plugins WHERE is_installed = true');
      
      for (const row of result.rows) {
        const plugin: Plugin = {
          id: row.id,
          name: row.name,
          version: row.version,
          description: row.description,
          author: row.author,
          isEnabled: row.is_enabled,
          isInstalled: row.is_installed,
          configuration: row.configuration,
          metadata: row.metadata,
          installedAt: row.installed_at,
          updatedAt: row.updated_at,
        };
        
        this.pluginData.set(row.name, plugin);
      }
      
      this.logger.info(`Loaded ${this.pluginData.size} plugins from database`);
    } catch (error) {
      this.logger.error('Failed to load plugin data', error);
    }
  }

  /**
   * Discover plugins in filesystem
   */
  private async discoverPlugins(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      
      const plugins = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      this.logger.info(`Discovered ${plugins.length} plugins in filesystem`);
      return plugins;
    } catch (error) {
      this.logger.error('Failed to discover plugins', error);
      return [];
    }
  }

  /**
   * Load enabled plugins
   */
  private async loadEnabledPlugins(): Promise<void> {
    for (const [pluginName, plugin] of this.pluginData) {
      if (plugin.isEnabled) {
        try {
          const pluginPath = path.join(this.pluginsDir, pluginName);
          const module = await this.loadPluginModule(pluginPath);
          
          this.plugins.set(pluginName, module);
          
          // Initialize and activate
          const context = this.createPluginContext(plugin);
          await module.initialize(context);
          await module.activate();
          
          // Register routes
          if (module.getRouter) {
            const router = module.getRouter();
            this.app.use(`/api/plugins/${pluginName}`, router);
            this.pluginRouters.set(pluginName, router);
          }
          
          this.logger.info(`Loaded and activated plugin: ${pluginName}`);
        } catch (error) {
          this.logger.error(`Failed to load plugin ${pluginName}`, error);
          
          // Disable plugin on load failure
          await this.db.query(
            'UPDATE plugins SET is_enabled = false WHERE name = $1',
            [pluginName]
          );
          plugin.isEnabled = false;
        }
      }
    }
  }

  /**
   * Load plugin module
   */
  private async loadPluginModule(pluginPath: string): Promise<PluginModule> {
    const indexPath = path.join(pluginPath, 'index.js');
    
    // Check if TypeScript source exists and compile if needed
    const tsPath = path.join(pluginPath, 'index.ts');
    try {
      await fs.access(tsPath);
      // In production, you'd compile TypeScript here
      // For now, assume pre-compiled JavaScript exists
    } catch {
      // No TypeScript source
    }
    
    // Clear module cache to allow hot reloading
    delete require.cache[require.resolve(indexPath)];
    
    const module = require(indexPath);
    return module.default || module;
  }

  /**
   * Load plugin metadata
   */
  private async loadPluginMetadata(pluginPath: string): Promise<PluginMetadata> {
    const metadataPath = path.join(pluginPath, 'plugin.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Check if plugin exists
   */
  private async pluginExists(pluginPath: string): Promise<boolean> {
    try {
      await fs.access(pluginPath);
      const metadataPath = path.join(pluginPath, 'plugin.json');
      await fs.access(metadataPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(metadata: PluginMetadata): Promise<void> {
    // Handle both simple array and complex object structures
    let dependencies: string[] = [];
    
    if (!metadata.dependencies) {
      return;
    }
    
    // Check if dependencies is an object with required/optional fields
    if (typeof metadata.dependencies === 'object' && !Array.isArray(metadata.dependencies)) {
      const deps = metadata.dependencies as any;
      if (deps.required && Array.isArray(deps.required)) {
        dependencies = deps.required;
      }
    } else if (Array.isArray(metadata.dependencies)) {
      dependencies = metadata.dependencies;
    }
    
    if (dependencies.length === 0) {
      return;
    }

    for (const dependency of dependencies) {
      const installed = this.pluginData.has(dependency);
      if (!installed) {
        throw new Error(`Missing dependency: ${dependency}`);
      }
      
      const depPlugin = this.pluginData.get(dependency)!;
      if (!depPlugin.isEnabled) {
        throw new Error(`Dependency ${dependency} is not enabled`);
      }
    }
  }

  /**
   * Validate plugin configuration
   */
  private validateConfiguration(metadata: PluginMetadata, config: Record<string, any>): void {
    if (!metadata.configuration) {
      return;
    }

    for (const configItem of metadata.configuration) {
      const value = config[configItem.key];
      
      // Check required fields
      if (configItem.required && (value === undefined || value === null)) {
        throw new Error(`Configuration field ${configItem.key} is required`);
      }
      
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      const actualType = typeof value;
      if (configItem.type === 'json') {
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          throw new Error(`Configuration field ${configItem.key} must be valid JSON`);
        }
      } else if (actualType !== configItem.type) {
        throw new Error(`Configuration field ${configItem.key} must be of type ${configItem.type}`);
      }
      
      // Additional validation
      if (configItem.validation) {
        const validation = configItem.validation;
        
        if (configItem.type === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            throw new Error(`Configuration field ${configItem.key} must be at least ${validation.min}`);
          }
          if (validation.max !== undefined && value > validation.max) {
            throw new Error(`Configuration field ${configItem.key} must be at most ${validation.max}`);
          }
        }
        
        if (configItem.type === 'string' && validation.pattern) {
          const pattern = new RegExp(validation.pattern);
          if (!pattern.test(value)) {
            throw new Error(`Configuration field ${configItem.key} does not match pattern ${validation.pattern}`);
          }
        }
        
        if (validation.options && !validation.options.includes(value)) {
          throw new Error(`Configuration field ${configItem.key} must be one of: ${validation.options.join(', ')}`);
        }
      }
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(plugin: Plugin): PluginContext {
    return {
      db: this.db,
      eventBus: this.eventBus,
      email: this.email,
      externalAPI: this.externalAPI,
      logger: this.logger.child({ plugin: plugin.name }),
      config: plugin.configuration,
    };
  }

  /**
   * Register event handlers for all plugins
   */
  private registerEventHandlers(): void {
    // Subscribe to all events and dispatch to plugins
    const allEvents = Object.values(EventBusService.EVENTS);
    
    for (const event of allEvents) {
      this.eventBus.subscribe(event, async (eventData) => {
        for (const [pluginName, module] of this.plugins) {
          const plugin = this.pluginData.get(pluginName);
          
          if (plugin?.isEnabled && module.handleEvent) {
            try {
              await module.handleEvent(event, eventData);
            } catch (error) {
              this.logger.error(`Plugin ${pluginName} failed to handle event ${event}`, error);
            }
          }
        }
      });
    }
  }
}

export default PluginLoader;