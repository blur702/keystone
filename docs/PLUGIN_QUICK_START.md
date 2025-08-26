# Plugin Quick Start Guide

## Create a Plugin in 5 Minutes

### Step 1: Create Plugin Directory
```bash
cd packages/backend/src/plugins
mkdir hello-world
cd hello-world
```

### Step 2: Create plugin.json
```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "My first Keystone plugin",
  "author": "Your Name",
  "routes": ["routes/api.js"]
}
```

### Step 3: Create index.ts
```typescript
import { Router } from 'express';
import { PluginModule, PluginContext } from '../../core/PluginLoader';

class HelloWorldPlugin implements PluginModule {
  private context: PluginContext;
  private router: Router;

  metadata = {
    name: "hello-world",
    version: "1.0.0",
    description: "My first Keystone plugin",
    author: "Your Name",
    routes: ["routes/api.js"]
  };

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.router = Router();
    
    // Add a simple route
    this.router.get('/hello', (req, res) => {
      res.json({ 
        message: 'Hello from my plugin!',
        timestamp: new Date().toISOString()
      });
    });
    
    this.context.logger.info('Hello World plugin initialized');
  }

  async activate(): Promise<void> {
    this.context.logger.info('Hello World plugin activated');
  }

  async deactivate(): Promise<void> {
    this.context.logger.info('Hello World plugin deactivated');
  }

  getRouter(): Router {
    return this.router;
  }

  async handleEvent(event: string, data: any): Promise<void> {
    // Handle events if needed
  }
}

export default new HelloWorldPlugin();
```

### Step 4: Build and Install
```bash
# Build TypeScript
cd /home/kevin/keystone
npm run build

# Install plugin via API
curl -X POST http://localhost:3000/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"plugin": "hello-world"}'

# Enable plugin
curl -X POST http://localhost:3000/api/plugins/hello-world/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Test Your Plugin
```bash
# Test the endpoint
curl http://localhost:3000/api/hello-world/hello

# Response:
{
  "message": "Hello from my plugin!",
  "timestamp": "2025-08-26T12:00:00.000Z"
}
```

## Plugin Templates

### 1. REST API Plugin
```typescript
// plugins/rest-api/index.ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';

class RestApiPlugin implements PluginModule {
  getRouter(): Router {
    const router = Router();
    
    // GET all items
    router.get('/items', async (req, res) => {
      const items = await this.context.db.query('SELECT * FROM items');
      res.json(items.rows);
    });
    
    // GET single item
    router.get('/items/:id', async (req, res) => {
      const result = await this.context.db.query(
        'SELECT * FROM items WHERE id = $1',
        [req.params.id]
      );
      res.json(result.rows[0]);
    });
    
    // POST new item (protected)
    router.post('/items', authMiddleware, async (req, res) => {
      const result = await this.context.db.query(
        'INSERT INTO items (name, data) VALUES ($1, $2) RETURNING *',
        [req.body.name, req.body.data]
      );
      res.status(201).json(result.rows[0]);
    });
    
    // PUT update item (protected)
    router.put('/items/:id', authMiddleware, async (req, res) => {
      const result = await this.context.db.query(
        'UPDATE items SET name = $2, data = $3 WHERE id = $1 RETURNING *',
        [req.params.id, req.body.name, req.body.data]
      );
      res.json(result.rows[0]);
    });
    
    // DELETE item (protected)
    router.delete('/items/:id', authMiddleware, async (req, res) => {
      await this.context.db.query(
        'DELETE FROM items WHERE id = $1',
        [req.params.id]
      );
      res.status(204).send();
    });
    
    return router;
  }
}
```

### 2. Event Listener Plugin
```typescript
// plugins/event-logger/index.ts
class EventLoggerPlugin implements PluginModule {
  async initialize(context: PluginContext): Promise<void> {
    // Create logs table
    await context.db.query(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100),
        event_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async activate(): Promise<void> {
    // Subscribe to all events
    const events = [
      'user.created',
      'user.updated',
      'user.deleted',
      'user.login'
    ];
    
    events.forEach(event => {
      this.context.eventBus.subscribe(event, async (data) => {
        await this.logEvent(event, data);
      });
    });
  }

  private async logEvent(event: string, data: any): Promise<void> {
    await this.context.db.query(
      'INSERT INTO event_logs (event_type, event_data) VALUES ($1, $2)',
      [event, JSON.stringify(data)]
    );
    
    this.context.logger.info(`Event logged: ${event}`);
  }
}
```

### 3. Scheduled Task Plugin
```typescript
// plugins/scheduler/index.ts
class SchedulerPlugin implements PluginModule {
  private intervals: NodeJS.Timeout[] = [];

  async activate(): Promise<void> {
    // Run every hour
    const hourly = setInterval(() => {
      this.runHourlyTask();
    }, 60 * 60 * 1000);
    
    // Run every day at midnight
    const daily = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.runDailyTask();
      }
    }, 60 * 1000);
    
    this.intervals.push(hourly, daily);
  }

  async deactivate(): Promise<void> {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
  }

  private async runHourlyTask(): Promise<void> {
    this.context.logger.info('Running hourly task');
    // Perform hourly operations
  }

  private async runDailyTask(): Promise<void> {
    this.context.logger.info('Running daily task');
    // Perform daily operations
  }
}
```

### 4. External API Integration Plugin
```typescript
// plugins/weather-api/index.ts
class WeatherApiPlugin implements PluginModule {
  metadata = {
    name: "weather-api",
    version: "1.0.0",
    configuration: [
      {
        key: "apiKey",
        type: "string",
        label: "OpenWeather API Key",
        required: true
      }
    ]
  };

  getRouter(): Router {
    const router = Router();
    
    router.get('/weather/:city', async (req, res) => {
      try {
        const weather = await this.getWeather(req.params.city);
        res.json(weather);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather' });
      }
    });
    
    return router;
  }

  private async getWeather(city: string): Promise<any> {
    const apiKey = this.context.config.apiKey;
    
    // Check cache first
    const cacheKey = `weather:${city}`;
    const cached = await this.context.db.cache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const response = await this.context.externalAPI.call({
      url: `https://api.openweathermap.org/data/2.5/weather`,
      method: 'GET',
      params: {
        q: city,
        appid: apiKey,
        units: 'metric'
      }
    });
    
    // Cache for 10 minutes
    await this.context.db.cache.set(cacheKey, response.data, 600);
    
    return response.data;
  }
}
```

## Common Patterns

### Error Handling
```typescript
router.get('/risky-operation', async (req, res) => {
  try {
    const result = await riskyOperation();
    res.json(result);
  } catch (error) {
    this.context.logger.error('Operation failed:', error);
    
    if (error.code === 'VALIDATION_ERROR') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

### Input Validation
```typescript
router.post('/users', async (req, res) => {
  const { email, name, age } = req.body;
  
  // Validate required fields
  if (!email || !name) {
    return res.status(400).json({ 
      error: 'Email and name are required' 
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }
  
  // Validate age if provided
  if (age !== undefined && (age < 0 || age > 150)) {
    return res.status(400).json({ 
      error: 'Invalid age' 
    });
  }
  
  // Process valid input
  // ...
});
```

### Pagination
```typescript
router.get('/items', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  
  const result = await this.context.db.query(
    'SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  
  const countResult = await this.context.db.query(
    'SELECT COUNT(*) FROM items'
  );
  
  res.json({
    items: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(countResult.rows[0].count / limit)
    }
  });
});
```

### Authentication Check
```typescript
import { authMiddleware } from '../../middleware/authMiddleware';

// Public route
router.get('/public', (req, res) => {
  res.json({ message: 'Public data' });
});

// Protected route
router.get('/private', authMiddleware, (req, res) => {
  const user = (req as any).user;
  res.json({ 
    message: 'Private data',
    userId: user.id,
    userEmail: user.email
  });
});

// Admin only route
router.delete('/admin/users/:id', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Delete user logic
});
```

## Testing Your Plugin

### Unit Test Example
```typescript
// plugins/hello-world/tests/hello-world.spec.ts
import { HelloWorldPlugin } from '../index';

describe('HelloWorld Plugin', () => {
  let plugin: HelloWorldPlugin;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      db: { query: jest.fn() },
      logger: { info: jest.fn(), error: jest.fn() },
      eventBus: { publish: jest.fn(), subscribe: jest.fn() },
      email: { send: jest.fn() },
      externalAPI: { call: jest.fn() },
      config: {}
    };
    
    plugin = new HelloWorldPlugin();
  });

  test('initializes successfully', async () => {
    await plugin.initialize(mockContext);
    
    expect(mockContext.logger.info).toHaveBeenCalledWith(
      'Hello World plugin initialized'
    );
  });

  test('activates successfully', async () => {
    await plugin.initialize(mockContext);
    await plugin.activate();
    
    expect(mockContext.logger.info).toHaveBeenCalledWith(
      'Hello World plugin activated'
    );
  });
});
```

### Integration Test Example
```bash
# Test plugin endpoint
curl -X GET http://localhost:3000/api/hello-world/hello \
  -H "Authorization: Bearer $TOKEN"

# Test with data
curl -X POST http://localhost:3000/api/hello-world/data \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Debugging Tips

### Enable Debug Logging
```typescript
// Set in .env
LOG_LEVEL=debug

// In plugin code
this.context.logger.debug('Detailed debug info', {
  input: data,
  result: processedData
});
```

### Check Plugin Status
```bash
# List all plugins
curl http://localhost:3000/api/plugins \
  -H "Authorization: Bearer $TOKEN"

# Check specific plugin
curl http://localhost:3000/api/plugins/hello-world \
  -H "Authorization: Bearer $TOKEN"
```

### View Plugin Logs
```bash
# Docker logs
docker logs keystone-backend -f | grep "hello-world"

# Or in development
npm run dev | grep "hello-world"
```

## Deployment Checklist

- [ ] Plugin metadata (plugin.json) is complete
- [ ] All dependencies are listed
- [ ] Database migrations are included
- [ ] Error handling is comprehensive
- [ ] Input validation is implemented
- [ ] Authentication is properly used
- [ ] Logging is appropriate (not too verbose)
- [ ] Tests are written and passing
- [ ] Documentation is provided
- [ ] Security best practices followed
- [ ] Performance optimizations applied
- [ ] Configuration schema defined
- [ ] Version number is correct

## Next Steps

1. Explore the [full documentation](./PLUGIN_DEVELOPMENT_GUIDE.md)
2. Review the [architecture guide](./PLUGIN_ARCHITECTURE.md)
3. Check out example plugins in `/packages/backend/src/plugins/`
4. Join the developer community
5. Contribute your plugin to the marketplace

---

*Quick Start Guide v1.0.0*
*Get started in 5 minutes!*