# Keystone Platform Developer's Guide

Welcome to the comprehensive Keystone Platform Developer's Guide. This documentation covers everything you need to build, extend, and deploy applications on the Keystone platform.

## Table of Contents
1. [Platform Architecture](#platform-architecture)
2. [Plugin System Deep Dive](#plugin-system-deep-dive)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Core Services](#core-services)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Integration](#database-integration)
7. [Event System](#event-system)
8. [Frontend Development](#frontend-development)
9. [Testing Strategies](#testing-strategies)
10. [Deployment Guide](#deployment-guide)
11. [Best Practices](#best-practices)
12. [API Reference](#api-reference)

---

## Platform Architecture

### Overview
Keystone is an enterprise-grade, extensible platform featuring a Drupal-inspired plugin system. Built on modern technologies, it provides a robust foundation for complex web applications.

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Frontend      │    │   Backend UI    │
│  Load Balancer  │    │  (Public App)   │    │  (Admin Panel)  │
│   SSL Termination│    │   React SPA     │    │   React SPA     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
          ┌─────────────────────────────────────────┐
          │              Backend API                 │
          │           (Express.js/TypeScript)        │
          │                                         │
          │  ┌─────────────────────────────────┐    │
          │  │        Plugin System            │    │
          │  │   ┌─────────────────────────┐   │    │
          │  │   │   Plugin Discovery      │   │    │
          │  │   │   Dynamic Loading       │   │    │
          │  │   │   Lifecycle Management  │   │    │
          │  │   └─────────────────────────┘   │    │
          │  └─────────────────────────────────┘    │
          │                                         │
          │  ┌─────────────────────────────────┐    │
          │  │        Core Services            │    │
          │  │   • Authentication Service      │    │
          │  │   • Database Service            │    │
          │  │   • Email Service               │    │
          │  │   • Event Bus Service           │    │
          │  │   • External API Service        │    │
          │  └─────────────────────────────────┘    │
          └─────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │ Python Services │
│   + PostGIS     │    │     Cache       │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Technologies
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React 18, Material-UI, Vite  
- **Database**: PostgreSQL with PostGIS extensions
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **Containerization**: Docker & Docker Compose
- **Monitoring**: Prometheus, Grafana, Loki

---

## Plugin System Deep Dive

The Keystone Platform features a sophisticated plugin system inspired by Drupal's architecture, enabling dynamic functionality extension without core modifications.

### Key Features
- **Manifest-Based Discovery**: Plugins self-describe via `manifest.json`
- **Dynamic Loading**: Runtime loading without restart
- **Permission Integration**: Seamless RBAC integration
- **Event-Driven Architecture**: Decoupled communication
- **Hot Swapping**: Enable/disable without downtime
- **Dependency Management**: Automatic resolution
- **UI Extensions**: Admin and public components

### Plugin Lifecycle
1. **Discovery**: Platform scans for `manifest.json` files
2. **Validation**: Structure and dependencies verified
3. **Registration**: Metadata stored in database
4. **Installation**: Migrations and permissions applied
5. **Loading**: Code dynamically loaded and initialized
6. **Integration**: Routes, hooks, UI components registered
7. **Execution**: Plugin handles requests and events

### Plugin Manifest Schema
See [Plugin Manifest Specification](plugin-manifest-spec.md) for complete details.

---

## Creating Your First Plugin

Let's build a "Hello World" plugin to demonstrate core concepts.

### 1. Plugin Structure
Create in `packages/backend/src/plugins/hello-world/`:

```
hello-world/
├── manifest.json          # Plugin metadata
├── index.ts              # Main plugin class
├── routes/
│   └── hello.ts          # API routes
├── admin/
│   └── HelloSettings.tsx # Admin UI
└── frontend/
    └── HelloWidget.tsx   # Public UI
```

### 2. Manifest Definition

```json
{
  "schemaVersion": "1.0",
  "id": "hello-world",
  "name": "Hello World Plugin",
  "version": "1.0.0",
  "description": "A simple example plugin demonstrating core concepts",
  "author": {
    "name": "Developer",
    "email": "dev@kevinalthaus.com"
  },
  "license": "MIT",
  "category": "utility",
  "compatibility": {
    "platform": ">=1.0.0",
    "node": ">=18.0.0"
  },
  "permissions": [
    "hello:read",
    "hello:write"
  ],
  "entryPoints": {
    "backend": {
      "routes": "./routes/hello.js",
      "main": "./index.js"
    },
    "admin": {
      "components": "./admin/HelloSettings.jsx"
    },
    "frontend": {
      "components": "./frontend/HelloWidget.jsx"
    }
  },
  "configuration": {
    "schema": {
      "type": "object",
      "properties": {
        "greeting": {
          "type": "string",
          "default": "Hello, World!"
        },
        "enabled": {
          "type": "boolean",
          "default": true
        }
      }
    }
  }
}
```

### 3. Main Plugin Class

```typescript
// index.ts
import { PluginContext } from '../../core/PluginSystem';

export default class HelloWorldPlugin {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async initialize(): Promise<void> {
    this.context.api.log('info', 'Hello World plugin initialized');
    this.context.api.on('user.created', this.onUserCreated.bind(this));
  }

  async cleanup(): Promise<void> {
    this.context.api.log('info', 'Hello World plugin cleaned up');
  }

  private async onUserCreated(data: any): Promise<void> {
    const greeting = this.context.api.getConfig('greeting');
    this.context.api.log('info', `${greeting} New user: ${data.email}`);
  }

  async getHello(req: any, res: any): Promise<void> {
    const greeting = this.context.api.getConfig('greeting');
    res.json({ message: greeting, timestamp: new Date().toISOString() });
  }

  async postHello(req: any, res: any): Promise<void> {
    const { message } = req.body;
    
    await this.context.api.emit('hello.received', { message, user: req.user });
    
    res.json({ 
      success: true, 
      echo: message,
      greeting: this.context.api.getConfig('greeting')
    });
  }
}
```

### 4. API Routes Configuration

```typescript
// routes/hello.ts
export const routes = [
  {
    path: '/hello',
    method: 'GET',
    handler: 'getHello',
    permissions: ['hello:read']
  },
  {
    path: '/hello',
    method: 'POST',
    handler: 'postHello',
    permissions: ['hello:write']
  }
];
```

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                    │
├─────────────┬────────────┬────────────┬────────────┬───────────┤
│   Frontend  │ Backend UI │   Backend  │   Python   │  Plugins  │
│   (React)   │  (Admin)   │  (Node.js) │  Services  │           │
├─────────────┴────────────┴────────────┴────────────┴───────────┤
│                      Core Services Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Auth   │ │ Database │ │  Email   │ │ EventBus │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────────────────────┤
│                     Data Layer                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ PostgreSQL   │ │    Redis     │ │   PostGIS    │           │
│  │  + PostGIS   │ │   (Cache)    │ │  (Spatial)   │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
├──────────────────────────────────────────────────────────────────┤
│                    Observability Stack                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Prometheus│ │ Grafana  │ │   Loki   │ │ Promtail │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React, Material UI, Vite
- **Database**: PostgreSQL 16 with PostGIS
- **Cache**: Redis 7
- **Email**: Brevo API
- **Container**: Docker, Docker Compose
- **Monitoring**: Prometheus, Grafana, Loki
- **CI/CD**: GitHub Actions (recommended)

---

## Core Services

### 1. DatabaseService
Manages PostgreSQL and Redis connections with built-in caching.

```typescript
import { DatabaseService } from '@keystone/backend/core/services/DatabaseService';

// Get instance
const db = DatabaseService.getInstance();

// Execute query with caching
const result = await db.query(
  'SELECT * FROM users WHERE status = $1',
  ['active'],
  { cache: true, cacheTTL: 300 }
);

// Transaction support
const user = await db.transaction(async (client) => {
  const userResult = await client.query('INSERT INTO users...');
  await client.query('INSERT INTO user_roles...');
  return userResult.rows[0];
});
```

### 2. AuthenticationService
Provides JWT-based authentication with full RBAC support.

```typescript
import { AuthenticationService } from '@keystone/backend/core/services/AuthenticationService';

const auth = AuthenticationService.getInstance();

// Register user
const user = await auth.register({
  email: 'user@example.com',
  username: 'johndoe',
  password: 'SecurePass123!',
  first_name: 'John',
  last_name: 'Doe'
});

// Login
const { user, token, refreshToken } = await auth.login({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Check permissions
const hasPermission = await auth.hasPermission(userId, 'users:create');

// Assign role
await auth.assignRole(userId, 'admin');
```

### 3. EmailService
Integrates with Brevo for transactional emails with webhook support.

```typescript
import { EmailService } from '@keystone/backend/core/services/EmailService';

const email = EmailService.getInstance();

// Send email
await email.sendEmail({
  to: [{ email: 'user@example.com', name: 'John Doe' }],
  subject: 'Welcome to Keystone',
  htmlContent: '<h1>Welcome!</h1>',
  tags: ['welcome', 'onboarding']
});

// Register subject handler for inbound emails
email.registerSubjectHandler(/^support/i, async (inboundEmail) => {
  // Create support ticket
  await createTicket(inboundEmail);
});

// Create email template
await email.createTemplate({
  name: 'welcome-email',
  subject: 'Welcome {{firstName}}!',
  htmlContent: '<h1>Welcome {{firstName}} {{lastName}}!</h1>',
  variables: ['firstName', 'lastName']
});
```

### 4. EventBusService
Provides decoupled communication between services and plugins.

```typescript
import { EventBusService } from '@keystone/backend/core/services/EventBusService';

const eventBus = EventBusService.getInstance();

// Publish event
await eventBus.publish('user:registered', 'auth-service', {
  userId: user.id,
  email: user.email
});

// Subscribe to events
const handlerId = eventBus.subscribe('user:registered', async (event) => {
  console.log('New user registered:', event.data);
  // Send welcome email
  await sendWelcomeEmail(event.data);
});

// Subscribe with filters
eventBus.subscribe('data:updated', handleUpdate, {
  filter: {
    source: 'plugin:analytics',
    metadata: { type: 'report' }
  },
  priority: 10
});

// Wait for event
const event = await eventBus.waitFor('system:ready', 30000);
```

---

## Plugin Development

### Creating a Plugin

#### 1. Plugin Structure
```
my-plugin/
├── plugin.json          # Plugin manifest
├── index.js            # Main entry point
├── src/
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   └── hooks/          # Event handlers
├── ui/                 # Optional UI components
│   ├── admin/          # Admin UI components
│   └── public/         # Public UI components
└── tests/              # Plugin tests
```

#### 2. Plugin Manifest (plugin.json)
```json
{
  "name": "my-analytics-plugin",
  "version": "1.0.0",
  "description": "Advanced analytics for Keystone",
  "author": "Your Name",
  "homepage": "https://example.com/plugin",
  "repository": "https://github.com/user/plugin",
  "main": "index.js",
  "dependencies": {
    "chart-plugin": "^2.0.0"
  },
  "requiredPermissions": [
    "system:monitor",
    "data:read"
  ],
  "routes": [
    {
      "path": "/analytics",
      "method": "GET",
      "handler": "getAnalytics",
      "permissions": ["data:read"]
    },
    {
      "path": "/analytics/export",
      "method": "POST",
      "handler": "exportAnalytics",
      "permissions": ["data:export"]
    }
  ],
  "hooks": [
    {
      "event": "user:login",
      "handler": "onUserLogin",
      "priority": 5
    }
  ],
  "configuration": {
    "schema": {
      "apiKey": {
        "type": "string",
        "required": true,
        "description": "Analytics API key"
      },
      "refreshInterval": {
        "type": "number",
        "default": 3600,
        "description": "Data refresh interval in seconds"
      }
    },
    "defaults": {
      "refreshInterval": 3600
    },
    "ui": {
      "component": "ConfigurationPanel",
      "route": "/admin/plugins/my-analytics/config"
    }
  },
  "ui": {
    "adminComponents": [
      {
        "name": "AnalyticsDashboard",
        "component": "ui/admin/Dashboard",
        "route": "/admin/analytics",
        "menuItem": {
          "label": "Analytics",
          "icon": "BarChart",
          "order": 10
        }
      }
    ]
  }
}
```

#### 3. Plugin Implementation (index.js)
```javascript
class MyAnalyticsPlugin {
  constructor(context) {
    this.context = context;
    this.db = context.services.database;
    this.events = context.services.events;
    this.logger = context.services.logger;
    this.config = context.config;
  }

  async initialize() {
    this.logger.info('Analytics plugin initializing...');
    
    // Set up database tables if needed
    await this.setupDatabase();
    
    // Register for events
    this.context.api.on('data:created', this.onDataCreated.bind(this));
    
    // Start background jobs
    this.startDataCollection();
    
    this.logger.info('Analytics plugin initialized');
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await this.db.query(
        'SELECT * FROM analytics WHERE user_id = $1',
        [req.user.userId]
      );
      
      res.json({
        success: true,
        data: analytics.rows
      });
    } catch (error) {
      this.logger.error('Failed to get analytics', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  }

  async exportAnalytics(req, res) {
    const { format, dateRange } = req.body;
    
    // Generate export
    const exportData = await this.generateExport(format, dateRange);
    
    // Send response
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
    res.send(exportData);
  }

  async onUserLogin(event) {
    // Track login analytics
    await this.db.query(
      'INSERT INTO login_analytics (user_id, timestamp, ip) VALUES ($1, $2, $3)',
      [event.data.userId, new Date(), event.data.ip]
    );
  }

  async cleanup() {
    // Clean up resources when plugin is disabled
    this.logger.info('Cleaning up analytics plugin...');
  }
}

module.exports = MyAnalyticsPlugin;
```

### Plugin Lifecycle

1. **Installation**: Plugin files are copied to `/plugins` directory
2. **Initialization**: `initialize()` method called when plugin is enabled
3. **Runtime**: Plugin handles routes, events, and background tasks
4. **Configuration**: Settings can be updated via admin UI
5. **Cleanup**: `cleanup()` method called when plugin is disabled
6. **Uninstallation**: Plugin files are removed

### Plugin API

Plugins have access to the following API through their context:

```typescript
interface PluginAPI {
  // Route registration
  registerRoute(route: PluginRoute): void;
  
  // Event handling
  on(event: string, handler: Function): void;
  emit(event: string, data: any): Promise<void>;
  
  // Configuration
  getConfig(key: string): any;
  setConfig(key: string, value: any): Promise<void>;
  
  // Logging
  log(level: string, message: string, meta?: any): void;
  
  // Hook registration
  registerHook(hook: PluginHook): void;
}
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

#### POST /api/auth/login
Authenticate and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "token": "jwt.token.here",
  "refreshToken": "refresh.token.here"
}
```

### User Management Endpoints

#### GET /api/users
Get paginated list of users. Requires `users:read` permission.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search term
- `status` (string): Filter by status

#### PUT /api/users/:id
Update user information. Requires `users:update` permission.

### Plugin Management Endpoints

#### GET /api/plugins
List all installed plugins. Requires `plugins:read` permission.

#### POST /api/plugins/install
Install a new plugin. Requires `plugins:install` permission.

**Request:** Multipart form with plugin ZIP file

#### POST /api/plugins/:name/enable
Enable a plugin. Requires `plugins:enable` permission.

#### POST /api/plugins/:name/disable
Disable a plugin. Requires `plugins:disable` permission.

#### GET /api/plugins/:name/config
Get plugin configuration. Requires `plugins:configure` permission.

#### PUT /api/plugins/:name/config
Update plugin configuration. Requires `plugins:configure` permission.

---

## Security & Authentication

### JWT Token Structure
```typescript
interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}
```

### Permission System

Permissions follow the format: `resource:action`

**Core Permissions:**
- `users:create` - Create new users
- `users:read` - View user information
- `users:update` - Update user information
- `users:delete` - Delete users
- `roles:*` - All role operations
- `plugins:*` - All plugin operations
- `system:*` - All system operations

### Using Middleware

```typescript
import { authenticate, authorize } from '@keystone/backend/middleware/auth';

// Require authentication
router.get('/profile', authenticate, (req, res) => {
  res.json(req.user);
});

// Require specific permissions
router.post('/users',
  authenticate,
  authorize('users:create'),
  createUserHandler
);

// Require one of multiple roles
router.get('/admin',
  authenticate,
  requireRole('admin', 'super_admin'),
  adminHandler
);
```

---

## Database Schema

### Core Tables

#### users
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `username` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `status` (ENUM)
- `is_active` (BOOLEAN)
- `is_verified` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### roles
- `id` (UUID, PK)
- `name` (VARCHAR, UNIQUE)
- `description` (TEXT)
- `is_system` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### permissions
- `id` (UUID, PK)
- `resource` (VARCHAR)
- `action` (VARCHAR)
- `description` (TEXT)
- UNIQUE(resource, action)

#### plugins
- `id` (UUID, PK)
- `name` (VARCHAR, UNIQUE)
- `version` (VARCHAR)
- `status` (ENUM)
- `configuration` (JSONB)
- `dependencies` (JSONB)
- `installed_at` (TIMESTAMP)

### Migrations

Run migrations:
```bash
npm run migrate:up
```

Create new migration:
```bash
npm run migrate:create -- migration-name
```

Rollback migration:
```bash
npm run migrate:down
```

---

## Deployment Guide

### Docker Deployment

1. **Build images:**
```bash
docker-compose build
```

2. **Start services:**
```bash
docker-compose up -d
```

3. **Run migrations:**
```bash
docker-compose exec backend npm run migrate:up
```

4. **Create admin user:**
```bash
docker-compose exec backend npm run seed:admin
```

### Environment Variables

Create `.env` file:
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=keystone
DB_USER=keystone
DB_PASSWORD=secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
BREVO_WEBHOOK_SECRET=webhook-secret
DEFAULT_FROM_EMAIL=noreply@kevinalthaus.com
DEFAULT_FROM_NAME=Keystone Platform

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=secure_password
```

### SSL Configuration

1. **Generate certificates:**
```bash
certbot certonly --standalone -d kevinalthaus.com -d www.kevinalthaus.com
```

2. **Copy certificates:**
```bash
cp /etc/letsencrypt/live/kevinalthaus.com/* ./nginx/ssl/kevinalthaus.com/
```

3. **Restart Nginx:**
```bash
docker-compose restart nginx
```

---

## Testing & Quality

### Running Tests

```bash
# All tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

### Accessibility Testing

The platform includes axe-core for automated accessibility testing:

```typescript
import { configureAxe } from '@axe-core/playwright';

test('page is accessible', async ({ page }) => {
  await page.goto('/');
  const results = await configureAxe(page).analyze();
  expect(results.violations).toHaveLength(0);
});
```

### Performance Monitoring

Access Grafana dashboards at `http://localhost:3001`:
- System metrics
- Application metrics
- Database performance
- API response times
- Error rates

---

## Best Practices

### 1. Plugin Development
- Always validate input data
- Use TypeScript for type safety
- Implement proper error handling
- Follow semantic versioning
- Write comprehensive tests
- Document all APIs

### 2. Security
- Never store sensitive data in code
- Use environment variables for secrets
- Implement rate limiting
- Validate and sanitize all inputs
- Use HTTPS in production
- Regular security audits

### 3. Performance
- Use database indexes appropriately
- Implement caching strategies
- Optimize database queries
- Use pagination for large datasets
- Monitor resource usage
- Profile and optimize bottlenecks

### 4. Maintenance
- Keep dependencies updated
- Regular database backups
- Monitor error logs
- Document deployment procedures
- Implement health checks
- Use structured logging

---

## Support & Resources

- **Documentation**: `/docs`
- **API Playground**: `http://localhost:3000/api-docs`
- **Monitoring**: `http://localhost:3001` (Grafana)
- **Logs**: `docker-compose logs -f [service]`

For additional support, consult the platform documentation or contact the development team.