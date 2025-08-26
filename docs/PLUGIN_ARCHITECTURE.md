# Keystone Platform Plugin Architecture

## System Architecture Overview

### Plugin Integration Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                          HTTP Request                                │
│                              ↓                                        │
│                     Express Application                              │
│                              ↓                                        │
│                      Request Pipeline                                │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  1. Helmet Security    → Sets security headers             │     │
│  │  2. CORS Middleware    → Handles cross-origin requests     │     │
│  │  3. Body Parser        → Parses request body               │     │
│  │  4. Morgan Logger      → Logs HTTP requests                │     │
│  │  5. Metrics MW         → Collects request metrics          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                        │
│                       Route Matching                                 │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Core Routes:                                              │     │
│  │   • /health            → Health check                      │     │
│  │   • /metrics           → Prometheus metrics                │     │
│  │   • /auth/*            → Authentication endpoints          │     │
│  │   • /api/auth/*        → Auth API                         │     │
│  │   • /api/grafana/*     → Grafana integration              │     │
│  │   • /api/plugins/*     → Plugin management API            │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                        │
│                      Plugin Routes                                   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Dynamic Mounting:                                         │     │
│  │   • /api/{plugin-name}/*        → Primary plugin path     │     │
│  │   • /api/plugins/{plugin-name}/* → Backward compatibility │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                        │
│                       Plugin Handler                                 │
│                              ↓                                        │
│                      Plugin Services                                 │
│                              ↓                                        │
│                        Response                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Plugin Loader Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Plugin Loader                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Initialization Phase:                                             │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  1. ensurePluginsDirectory()                             │      │
│  │     → Creates /plugins directory if not exists           │      │
│  │                                                           │      │
│  │  2. loadPluginData()                                      │      │
│  │     → Queries database for installed plugins              │      │
│  │     → Loads plugin configurations                         │      │
│  │                                                           │      │
│  │  3. discoverPlugins()                                     │      │
│  │     → Scans filesystem for plugin directories             │      │
│  │     → Validates plugin.json metadata                      │      │
│  │                                                           │      │
│  │  4. loadEnabledPlugins()                                  │      │
│  │     → Loads JavaScript/TypeScript modules                 │      │
│  │     → Creates plugin contexts                             │      │
│  │     → Calls initialize() on each plugin                   │      │
│  │     → Calls activate() on each plugin                     │      │
│  │     → Mounts routes to Express app                       │      │
│  │                                                           │      │
│  │  5. registerEventHandlers()                               │      │
│  │     → Subscribes to system events                         │      │
│  │     → Routes events to plugin handlers                    │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  Runtime Management:                                                │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  • installPlugin()    → Add new plugin to system         │      │
│  │  • uninstallPlugin()  → Remove plugin completely         │      │
│  │  • enablePlugin()     → Activate installed plugin        │      │
│  │  • disablePlugin()    → Deactivate plugin temporarily    │      │
│  │  • updatePluginConfig() → Update plugin settings         │      │
│  │  • reloadPlugin()     → Restart plugin with new config   │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  Plugin Registry:                                                   │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  Map<string, PluginModule>  → Active plugin instances    │      │
│  │  Map<string, Plugin>        → Plugin metadata/config     │      │
│  │  Map<string, Router>        → Plugin Express routers     │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Plugin Context and Services

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Plugin Context                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Each plugin receives a context object with:                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  DatabaseService                                         │      │
│  │  ├─ query()          Execute SQL queries                 │      │
│  │  ├─ transaction()    Database transactions               │      │
│  │  ├─ cache.get()      Redis cache read                   │      │
│  │  ├─ cache.set()      Redis cache write                  │      │
│  │  └─ cache.delete()   Redis cache invalidation           │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  EventBusService                                         │      │
│  │  ├─ publish()        Emit system events                  │      │
│  │  ├─ subscribe()      Listen to events                    │      │
│  │  ├─ unsubscribe()    Stop listening                      │      │
│  │  └─ EVENTS          Predefined event constants           │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  EmailService                                            │      │
│  │  ├─ send()           Send templated email                │      │
│  │  ├─ sendBatch()      Send bulk emails                    │      │
│  │  ├─ sendWithAttachment() Send with files                 │      │
│  │  └─ validateEmail()  Email validation                    │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  ExternalAPIService                                       │      │
│  │  ├─ call()           Make HTTP requests                  │      │
│  │  ├─ get()            GET request helper                  │      │
│  │  ├─ post()           POST request helper                 │      │
│  │  └─ withCache()      Cached API calls                    │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  Logger (Winston)                                         │      │
│  │  ├─ error()          Log errors with stack               │      │
│  │  ├─ warn()           Log warnings                        │      │
│  │  ├─ info()           Log information                     │      │
│  │  └─ debug()          Debug logging                       │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  Configuration                                           │      │
│  │  └─ Plugin-specific settings from database               │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Plugin Lifecycle State Machine

```
┌──────────────┐
│   DISCOVERED │ ← Plugin found in filesystem
└──────┬───────┘
       │
       │ install()
       ↓
┌──────────────┐
│   INSTALLED  │ ← Metadata stored in database
└──────┬───────┘
       │
       │ enable()
       ↓
┌──────────────┐
│ INITIALIZING │ ← Loading module, creating context
└──────┬───────┘
       │
       │ initialize()
       ↓
┌──────────────┐
│  ACTIVATING  │ ← Starting services, mounting routes
└──────┬───────┘
       │
       │ activate()
       ↓
┌──────────────┐
│    ENABLED   │ ← Plugin fully operational
└──────┬───────┘
       │
       │ disable()
       ↓
┌──────────────┐
│ DEACTIVATING │ ← Stopping services, unmounting routes
└──────┬───────┘
       │
       │ deactivate()
       ↓
┌──────────────┐
│   DISABLED   │ ← Plugin inactive but installed
└──────┬───────┘
       │
       │ uninstall()
       ↓
┌──────────────┐
│ UNINSTALLING │ ← Cleaning up resources
└──────┬───────┘
       │
       │ uninstall() complete
       ↓
┌──────────────┐
│   REMOVED    │ ← Plugin completely removed
└──────────────┘
```

### Database Schema

```sql
-- Core plugin registry table
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    is_enabled BOOLEAN DEFAULT false,
    is_installed BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP
);

-- Plugin events audit log
CREATE TABLE plugin_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- installed, enabled, disabled, uninstalled, configured
    event_data JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plugin API usage metrics
CREATE TABLE plugin_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER, -- milliseconds
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_plugins_name ON plugins(name);
CREATE INDEX idx_plugins_enabled ON plugins(is_enabled);
CREATE INDEX idx_plugin_events_plugin ON plugin_events(plugin_id);
CREATE INDEX idx_plugin_events_type ON plugin_events(event_type);
CREATE INDEX idx_plugin_metrics_plugin ON plugin_metrics(plugin_id);
CREATE INDEX idx_plugin_metrics_created ON plugin_metrics(created_at);
```

## Example Plugin Implementations

### 1. Simple Health Check Plugin

```typescript
// plugins/health-monitor/index.ts
import { PluginModule, PluginContext } from '../../core/PluginLoader';
import { Router } from 'express';

class HealthMonitorPlugin implements PluginModule {
  private context: PluginContext;
  private router: Router;

  metadata = {
    name: "health-monitor",
    version: "1.0.0",
    description: "System health monitoring",
    author: "Keystone Team"
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.router = Router();
    
    this.router.get('/status', async (req, res) => {
      const dbHealth = await this.checkDatabase();
      const cacheHealth = await this.checkCache();
      
      res.json({
        status: dbHealth && cacheHealth ? 'healthy' : 'degraded',
        services: {
          database: dbHealth ? 'up' : 'down',
          cache: cacheHealth ? 'up' : 'down'
        }
      });
    });
  }

  async activate(): Promise<void> {
    this.context.logger.info('Health monitor activated');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Health monitor deactivated');
  }

  getRouter(): Router {
    return this.router;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.context.db.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkCache(): Promise<boolean> {
    try {
      await this.context.db.cache.set('health', 'ok', 1);
      return true;
    } catch {
      return false;
    }
  }
}

export default new HealthMonitorPlugin();
```

### 2. Event-Driven Analytics Plugin

```typescript
// plugins/analytics/index.ts
class AnalyticsPlugin implements PluginModule {
  private eventCounts: Map<string, number> = new Map();

  async initialize(context: PluginContext): Promise<void> {
    // Subscribe to all system events
    Object.values(EventBusService.EVENTS).forEach(event => {
      context.eventBus.subscribe(event, this.trackEvent.bind(this));
    });
  }

  private async trackEvent(data: any): Promise<void> {
    const event = data.type || 'unknown';
    const count = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, count + 1);
    
    // Store in database
    await this.context.db.query(`
      INSERT INTO analytics_events (event_type, data, created_at)
      VALUES ($1, $2, NOW())
    `, [event, JSON.stringify(data)]);
  }

  getRouter(): Router {
    const router = Router();
    
    router.get('/events/summary', (req, res) => {
      const summary = Array.from(this.eventCounts.entries()).map(([event, count]) => ({
        event,
        count
      }));
      res.json(summary);
    });
    
    return router;
  }
}
```

### 3. Webhook Integration Plugin

```typescript
// plugins/webhooks/index.ts
class WebhookPlugin implements PluginModule {
  async handleEvent(event: string, data: any): Promise<void> {
    const webhookUrl = this.context.config.webhookUrl;
    if (!webhookUrl) return;
    
    try {
      await this.context.externalAPI.call({
        url: webhookUrl,
        method: 'POST',
        data: {
          event,
          timestamp: new Date().toISOString(),
          payload: data
        }
      });
    } catch (error) {
      this.context.logger.error('Webhook delivery failed:', error);
    }
  }
}
```

## Security Considerations

### Plugin Isolation
- Each plugin runs in the same Node.js process but with isolated context
- Plugins cannot directly access other plugins' data or services
- Database access is mediated through the DatabaseService

### Permission Model
```typescript
// Future implementation
interface PluginPermissions {
  database: {
    read: boolean;
    write: boolean;
    createTables: boolean;
  };
  email: {
    send: boolean;
    bulkSend: boolean;
  };
  externalAPI: {
    allowed: boolean;
    whitelist: string[];
  };
  events: {
    publish: string[];
    subscribe: string[];
  };
}
```

### Best Practices
1. **Input Validation**: Always validate and sanitize user input
2. **SQL Injection Prevention**: Use parameterized queries
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Authentication**: Use the provided authMiddleware for protected routes
5. **Secrets Management**: Never hardcode secrets, use configuration
6. **Error Handling**: Never expose internal errors to users
7. **Logging**: Log security events for audit trails

## Performance Optimization

### Caching Strategy
```typescript
// Cache expensive operations
const cacheKey = `plugin:${this.metadata.name}:data:${userId}`;
let data = await this.context.db.cache.get(cacheKey);

if (!data) {
  data = await this.expensiveOperation(userId);
  await this.context.db.cache.set(cacheKey, data, 3600); // 1 hour TTL
}
```

### Database Optimization
```typescript
// Use indexes for frequently queried columns
await this.context.db.query(`
  CREATE INDEX IF NOT EXISTS idx_plugin_user_lookup 
  ON plugin_data(user_id, created_at DESC);
`);

// Batch operations
await this.context.db.transaction(async (client) => {
  for (const item of items) {
    await client.query('INSERT INTO ...', [item]);
  }
});
```

### Async Operations
```typescript
// Use Promise.all for parallel operations
const [users, settings, permissions] = await Promise.all([
  this.getUsers(),
  this.getSettings(),
  this.getPermissions()
]);
```

## Monitoring and Debugging

### Logging
```typescript
// Structured logging
this.context.logger.info('Operation completed', {
  plugin: this.metadata.name,
  operation: 'data_sync',
  duration: Date.now() - startTime,
  recordsProcessed: count
});
```

### Metrics Collection
```typescript
// Expose metrics for Prometheus
router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
    # HELP plugin_requests_total Total number of requests
    # TYPE plugin_requests_total counter
    plugin_requests_total{plugin="${this.metadata.name}"} ${this.requestCount}
    
    # HELP plugin_errors_total Total number of errors
    # TYPE plugin_errors_total counter
    plugin_errors_total{plugin="${this.metadata.name}"} ${this.errorCount}
  `);
});
```

### Debug Mode
```typescript
if (process.env.NODE_ENV === 'development') {
  this.context.logger.debug('Detailed debug info', {
    request: req.body,
    headers: req.headers,
    user: req.user
  });
}
```

## Version Control and Updates

### Semantic Versioning
- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

### Migration Support
```typescript
// plugins/my-plugin/migrations.ts
export const migrations = [
  {
    version: '1.0.0',
    up: async (db) => {
      await db.query('CREATE TABLE ...');
    },
    down: async (db) => {
      await db.query('DROP TABLE ...');
    }
  },
  {
    version: '1.1.0',
    up: async (db) => {
      await db.query('ALTER TABLE ... ADD COLUMN ...');
    },
    down: async (db) => {
      await db.query('ALTER TABLE ... DROP COLUMN ...');
    }
  }
];
```

## Plugin Distribution

### NPM Package Structure
```json
{
  "name": "@keystone/plugin-example",
  "version": "1.0.0",
  "main": "dist/index.js",
  "files": [
    "dist/",
    "plugin.json",
    "migrations/",
    "README.md"
  ],
  "keystone": {
    "type": "plugin",
    "compatibility": "^1.0.0"
  }
}
```

### Installation Methods
1. **Manual**: Copy files to plugins directory
2. **CLI**: `keystone plugin install @keystone/plugin-example`
3. **API**: POST `/api/plugins/install`
4. **Git**: Clone from repository
5. **Package Manager**: npm/yarn install

---

*Architecture Version: 1.0.0*
*Last Updated: 2025-08-26*