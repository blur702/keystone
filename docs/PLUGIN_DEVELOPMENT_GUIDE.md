# Keystone Platform Plugin Development Guide

## Table of Contents
1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Plugin Structure](#plugin-structure)
5. [Core Services API](#core-services-api)
6. [Plugin Lifecycle](#plugin-lifecycle)
7. [Best Practices](#best-practices)
8. [Testing Plugins](#testing-plugins)
9. [Deployment](#deployment)

## Overview

The Keystone Platform uses a powerful plugin system that allows developers to extend the platform's functionality without modifying core code. Plugins are self-contained modules that can:

- Add new API endpoints
- Integrate with external services
- React to system events
- Store and retrieve data
- Send emails and notifications
- Access core platform services

## Plugin Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│                   Express Application                │
├─────────────────────────────────────────────────────┤
│                    Core Middleware                   │
│        (Auth, CORS, Body Parser, Metrics)           │
├─────────────────────────────────────────────────────┤
│                    Core Routes                       │
│           (/auth, /api/auth, /api/grafana)          │
├─────────────────────────────────────────────────────┤
│                   Plugin Loader                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │   Plugin 1   │  │   Plugin 2   │  │Plugin N...│  │
│  │/api/plugin-1 │  │/api/plugin-2 │  │/api/...   │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────┤
│                   Core Services                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Database │ │EventBus  │ │  Email   │ │External│ │
│  │ Service  │ │ Service  │ │ Service  │ │  API   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│              Database (PostgreSQL + Redis)           │
└─────────────────────────────────────────────────────┘
```

### Plugin Loading Process
1. **Discovery**: System scans `/packages/backend/src/plugins/` directory
2. **Metadata Loading**: Reads `plugin.json` for each plugin
3. **Database Check**: Verifies plugin installation status
4. **Initialization**: Creates plugin context with core services
5. **Activation**: Calls plugin's `activate()` method
6. **Route Mounting**: Mounts plugin routes at `/api/{plugin-name}`

## Creating Your First Plugin

### Step 1: Plugin Directory Structure
Create a new directory in `/packages/backend/src/plugins/`:

```bash
packages/backend/src/plugins/
└── my-plugin/
    ├── plugin.json          # Plugin metadata (required)
    ├── index.ts            # Main plugin module (required)
    ├── routes/             # API route handlers
    │   └── api.ts
    ├── services/           # Business logic
    │   └── MyService.ts
    ├── models/             # Data models
    │   └── MyModel.ts
    ├── migrations/         # Database migrations
    │   └── 001_initial.sql
    └── tests/              # Plugin tests
        └── my-plugin.spec.ts
```

### Step 2: Plugin Metadata (plugin.json)
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A sample plugin for Keystone Platform",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "dependencies": [],
  "routes": ["routes/api.js"],
  "hooks": ["user.created", "user.deleted"],
  "permissions": ["database.read", "email.send"],
  "configuration": [
    {
      "key": "apiKey",
      "type": "string",
      "label": "API Key",
      "description": "External service API key",
      "required": true,
      "validation": {
        "pattern": "^[A-Za-z0-9-_]{32,}$"
      }
    },
    {
      "key": "webhookUrl",
      "type": "string",
      "label": "Webhook URL",
      "description": "URL to receive webhook notifications",
      "required": false,
      "default": ""
    },
    {
      "key": "maxRetries",
      "type": "number",
      "label": "Max Retries",
      "description": "Maximum number of retry attempts",
      "required": false,
      "default": 3,
      "validation": {
        "min": 1,
        "max": 10
      }
    }
  ]
}
```

### Step 3: Main Plugin Module (index.ts)
```typescript
import { Router } from 'express';
import { PluginModule, PluginContext } from '../../core/PluginLoader';
import { MyService } from './services/MyService';
import apiRoutes from './routes/api';

class MyPlugin implements PluginModule {
  private context: PluginContext;
  private service: MyService;
  private router: Router;

  // Plugin metadata
  metadata = {
    name: "my-plugin",
    version: "1.0.0",
    description: "A sample plugin for Keystone Platform",
    author: "Your Name",
    routes: ["routes/api.js"],
    hooks: ["user.created", "user.deleted"],
    configuration: []
  };

  /**
   * Initialize the plugin with core services
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.context.logger.info('Initializing My Plugin...');
    
    // Initialize plugin services
    this.service = new MyService(
      context.db,
      context.logger,
      context.config
    );
    
    // Set up database tables if needed
    await this.setupDatabase();
    
    // Initialize router
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Activate the plugin
   */
  async activate(): Promise<void> {
    this.context.logger.info('Activating My Plugin...');
    
    // Register event listeners
    this.context.eventBus.subscribe('user.created', this.handleUserCreated.bind(this));
    this.context.eventBus.subscribe('user.deleted', this.handleUserDeleted.bind(this));
    
    // Start any background tasks
    await this.startBackgroundTasks();
  }

  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    this.context.logger.info('Deactivating My Plugin...');
    
    // Clean up resources
    await this.stopBackgroundTasks();
    
    // Unsubscribe from events
    this.context.eventBus.unsubscribe('user.created', this.handleUserCreated.bind(this));
    this.context.eventBus.unsubscribe('user.deleted', this.handleUserDeleted.bind(this));
  }

  /**
   * Uninstall the plugin (optional)
   */
  async uninstall(): Promise<void> {
    this.context.logger.info('Uninstalling My Plugin...');
    
    // Drop plugin tables
    await this.context.db.query(`
      DROP TABLE IF EXISTS my_plugin_data CASCADE;
    `);
  }

  /**
   * Get the plugin's Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Handle system events
   */
  async handleEvent(event: string, data: any): Promise<void> {
    this.context.logger.debug(`Handling event: ${event}`, data);
    
    switch (event) {
      case 'user.created':
        await this.handleUserCreated(data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(data);
        break;
    }
  }

  // Private methods
  private async setupDatabase(): Promise<void> {
    // Create plugin-specific tables
    await this.context.db.query(`
      CREATE TABLE IF NOT EXISTS my_plugin_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await this.context.db.query(`
      CREATE INDEX IF NOT EXISTS idx_my_plugin_user_id 
      ON my_plugin_data(user_id);
    `);
  }

  private setupRoutes(): void {
    // Health check
    this.router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        plugin: 'my-plugin',
        version: this.metadata.version,
        timestamp: new Date().toISOString()
      });
    });

    // Mount API routes
    this.router.use('/', apiRoutes(this.service, this.context));
  }

  private async handleUserCreated(data: any): Promise<void> {
    this.context.logger.info('User created:', data);
    
    // Initialize user data
    await this.context.db.query(`
      INSERT INTO my_plugin_data (user_id, data)
      VALUES ($1, $2)
    `, [data.userId, JSON.stringify({ initialized: true })]);
    
    // Send welcome email
    await this.context.email.send({
      to: data.email,
      subject: 'Welcome to My Plugin!',
      template: 'welcome',
      data: {
        userName: data.name
      }
    });
  }

  private async handleUserDeleted(data: any): Promise<void> {
    this.context.logger.info('User deleted:', data);
    // Data will be automatically deleted due to CASCADE
  }

  private async startBackgroundTasks(): Promise<void> {
    // Start any recurring tasks
  }

  private async stopBackgroundTasks(): Promise<void> {
    // Stop any recurring tasks
  }
}

export default new MyPlugin();
```

### Step 4: Routes (routes/api.ts)
```typescript
import { Router, Request, Response } from 'express';
import { MyService } from '../services/MyService';
import { PluginContext } from '../../../core/PluginLoader';
import { authMiddleware } from '../../../middleware/authMiddleware';

export default (service: MyService, context: PluginContext): Router => {
  const router = Router();

  // Public endpoint
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const status = await service.getStatus();
      res.json(status);
    } catch (error) {
      context.logger.error('Error getting status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Protected endpoint (requires authentication)
  router.get('/data', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const data = await service.getUserData(userId);
      res.json(data);
    } catch (error) {
      context.logger.error('Error getting user data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create resource
  router.post('/resource', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const resource = await service.createResource(userId, req.body);
      
      // Publish event
      await context.eventBus.publish(
        'my_plugin.resource_created',
        'my-plugin',
        { resourceId: resource.id, userId }
      );
      
      res.status(201).json(resource);
    } catch (error) {
      context.logger.error('Error creating resource:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update resource
  router.put('/resource/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const resource = await service.updateResource(
        req.params.id,
        userId,
        req.body
      );
      res.json(resource);
    } catch (error) {
      context.logger.error('Error updating resource:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete resource
  router.delete('/resource/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      await service.deleteResource(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      context.logger.error('Error deleting resource:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
```

### Step 5: Service Layer (services/MyService.ts)
```typescript
import { DatabaseService } from '../../../core/services/DatabaseService';
import winston from 'winston';

export class MyService {
  constructor(
    private db: DatabaseService,
    private logger: winston.Logger,
    private config: Record<string, any>
  ) {}

  async getStatus() {
    return {
      status: 'operational',
      apiKey: this.config.apiKey ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    };
  }

  async getUserData(userId: string) {
    const result = await this.db.query(`
      SELECT * FROM my_plugin_data WHERE user_id = $1
    `, [userId]);
    
    return result.rows[0] || null;
  }

  async createResource(userId: string, data: any) {
    const result = await this.db.query(`
      INSERT INTO my_plugin_resources (user_id, name, data)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, data.name, JSON.stringify(data)]);
    
    return result.rows[0];
  }

  async updateResource(resourceId: string, userId: string, data: any) {
    const result = await this.db.query(`
      UPDATE my_plugin_resources 
      SET data = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [resourceId, userId, JSON.stringify(data)]);
    
    if (result.rows.length === 0) {
      throw new Error('Resource not found or unauthorized');
    }
    
    return result.rows[0];
  }

  async deleteResource(resourceId: string, userId: string) {
    const result = await this.db.query(`
      DELETE FROM my_plugin_resources 
      WHERE id = $1 AND user_id = $2
    `, [resourceId, userId]);
    
    if (result.rowCount === 0) {
      throw new Error('Resource not found or unauthorized');
    }
  }

  // External API integration example
  async callExternalAPI(endpoint: string, data: any) {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`https://api.example.com/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('External API call failed:', error);
      throw error;
    }
  }
}
```

## Plugin Structure

### Required Files
- `plugin.json` - Plugin metadata and configuration schema
- `index.ts/js` - Main plugin module implementing PluginModule interface

### Optional Directories
- `routes/` - Express route handlers
- `services/` - Business logic and external integrations
- `models/` - Data models and TypeScript interfaces
- `migrations/` - Database schema migrations
- `tests/` - Unit and integration tests
- `docs/` - Plugin-specific documentation
- `assets/` - Static assets (images, templates)

## Core Services API

### DatabaseService
```typescript
// Query database
const result = await context.db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction support
await context.db.transaction(async (client) => {
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
});

// Cache management
await context.db.cache.set('key', value, ttl);
const cached = await context.db.cache.get('key');
await context.db.cache.delete('key');
```

### EventBusService
```typescript
// Publish events
await context.eventBus.publish('event.name', 'source', data);

// Subscribe to events
context.eventBus.subscribe('event.name', async (data) => {
  // Handle event
});

// Available system events
EventBusService.EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  PLUGIN_INSTALLED: 'plugin.installed',
  PLUGIN_ENABLED: 'plugin.enabled',
  PLUGIN_DISABLED: 'plugin.disabled',
  PLUGIN_UNINSTALLED: 'plugin.uninstalled',
  EMAIL_SENT: 'email.sent',
  EMAIL_FAILED: 'email.failed',
  WEBHOOK_RECEIVED: 'webhook.received'
};
```

### EmailService
```typescript
// Send email
await context.email.send({
  to: 'user@example.com',
  subject: 'Subject',
  template: 'template-name',
  data: { name: 'John' }
});

// Send with attachment
await context.email.sendWithAttachment({
  to: 'user@example.com',
  subject: 'Report',
  body: 'Please find attached',
  attachments: [
    {
      filename: 'report.pdf',
      content: Buffer.from(pdfData)
    }
  ]
});
```

### ExternalAPIService
```typescript
// Make API calls with built-in retry and caching
const response = await context.externalAPI.call({
  url: 'https://api.example.com/endpoint',
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  data: { key: 'value' },
  cache: true,
  ttl: 3600
});
```

### Logger
```typescript
// Log levels
context.logger.error('Error message', error);
context.logger.warn('Warning message');
context.logger.info('Info message');
context.logger.debug('Debug message', { data });
```

## Plugin Lifecycle

### 1. Installation
- Plugin files copied to plugins directory
- Metadata validated
- Dependencies checked
- Database entry created

### 2. Initialization
- Plugin module loaded
- Context created with core services
- `initialize()` method called
- Database tables created

### 3. Activation
- `activate()` method called
- Event listeners registered
- Routes mounted at `/api/{plugin-name}`
- Background tasks started

### 4. Runtime
- Handle HTTP requests
- Process events
- Execute background tasks
- Access core services

### 5. Deactivation
- `deactivate()` method called
- Routes unmounted
- Event listeners removed
- Background tasks stopped

### 6. Uninstallation
- `uninstall()` method called (optional)
- Database tables dropped
- Plugin files removed
- Database entry deleted

## Best Practices

### 1. Error Handling
```typescript
try {
  // Plugin code
} catch (error) {
  context.logger.error('Operation failed:', error);
  // Graceful fallback
}
```

### 2. Database Migrations
```typescript
// Use versioned migrations
const MIGRATIONS = [
  {
    version: 1,
    up: async (db) => {
      await db.query('CREATE TABLE ...');
    },
    down: async (db) => {
      await db.query('DROP TABLE ...');
    }
  }
];
```

### 3. Configuration Validation
```typescript
validateConfig(config: Record<string, any>) {
  if (!config.apiKey) {
    throw new Error('API key is required');
  }
  // Additional validation
}
```

### 4. Resource Cleanup
```typescript
async deactivate() {
  // Clear timers
  clearInterval(this.timer);
  
  // Close connections
  await this.connection?.close();
  
  // Unsubscribe events
  this.eventHandlers.forEach(handler => {
    this.context.eventBus.unsubscribe(handler.event, handler.callback);
  });
}
```

### 5. Security
- Always validate user input
- Use parameterized queries
- Implement rate limiting
- Check user permissions
- Sanitize output

### 6. Performance
- Cache expensive operations
- Use database indexes
- Implement pagination
- Optimize queries
- Use background jobs for heavy tasks

## Testing Plugins

### Unit Tests
```typescript
// tests/my-service.spec.ts
import { MyService } from '../services/MyService';

describe('MyService', () => {
  let service: MyService;
  let mockDb: any;
  let mockLogger: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn()
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };
    service = new MyService(mockDb, mockLogger, {});
  });

  test('getUserData returns user data', async () => {
    mockDb.query.mockResolvedValue({
      rows: [{ id: '123', data: {} }]
    });

    const result = await service.getUserData('123');
    
    expect(result).toEqual({ id: '123', data: {} });
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.any(String),
      ['123']
    );
  });
});
```

### Integration Tests
```typescript
// tests/integration.spec.ts
import request from 'supertest';
import app from '../../../server';

describe('My Plugin API', () => {
  test('GET /api/my-plugin/health returns healthy', async () => {
    const response = await request(app)
      .get('/api/my-plugin/health')
      .expect(200);
    
    expect(response.body).toEqual({
      status: 'healthy',
      plugin: 'my-plugin',
      version: '1.0.0',
      timestamp: expect.any(String)
    });
  });
});
```

## Deployment

### Development Environment
```bash
# Install plugin
curl -X POST http://localhost:3000/api/plugins/install \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"plugin": "my-plugin"}'

# Enable plugin
curl -X POST http://localhost:3000/api/plugins/my-plugin/enable \
  -H "Authorization: Bearer $TOKEN"

# Configure plugin
curl -X PUT http://localhost:3000/api/plugins/my-plugin/config \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"apiKey": "secret-key", "webhookUrl": "https://..."}'
```

### Production Environment
1. Build plugin: `npm run build:plugin`
2. Deploy files to production server
3. Install via admin API or CLI
4. Configure with production settings
5. Monitor logs and metrics

### Plugin Package Structure for Distribution
```
my-plugin-1.0.0/
├── dist/               # Compiled JavaScript
│   ├── index.js
│   ├── routes/
│   └── services/
├── plugin.json         # Metadata
├── migrations/         # Database migrations
├── assets/            # Static assets
├── README.md          # Documentation
└── LICENSE            # License file
```

## Examples

### Complete Plugin Examples
1. **address-validator** - Address validation and geocoding
2. **email-templates** - Custom email template management
3. **audit-log** - System activity logging
4. **backup-manager** - Automated backup scheduling
5. **api-gateway** - External API proxy and caching

## Support

For questions and support:
- Documentation: `/docs/plugins`
- API Reference: `/api/docs`
- Community Forum: `https://forum.keystone.dev`
- GitHub Issues: `https://github.com/keystone/platform`

## License

Plugins should specify their license in `plugin.json`. The Keystone Platform core is licensed under MIT.

---

*Last Updated: 2025-08-26*
*Version: 1.0.0*