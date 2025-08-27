# @keystone/backend

Node.js backend application with dynamic plugin system providing core business logic and API services.

## Overview

This package contains the backend application layer responsible for:
- RESTful API endpoints
- Dynamic plugin system with dependency management
- Business logic implementation
- Database interactions (PostgreSQL + Redis)
- JWT authentication and RBAC authorization
- Email service integration (Brevo)
- Integration with external services
- Communication with Python calculation services

## Structure

```
backend/
├── src/
│   ├── core/         # Core services (Auth, DB, Email, Plugin)
│   │   ├── services/ # Service implementations
│   │   └── PluginLoader.ts # Plugin system
│   ├── plugins/      # Dynamic plugin modules
│   ├── routes/       # API route definitions
│   ├── middleware/   # Express middleware
│   ├── utils/        # Utility functions
│   └── server.ts     # Application entry point
└── tests/            # Test suites
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file in the package root:

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=keystone
DB_USER=keystone
DB_PASSWORD=keystone-dev-2024

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Service
BREVO_API_KEY=your-brevo-api-key

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,https://kevinalthaus.com
```

## Plugin System

The backend includes a dynamic plugin system:

- **Location**: `src/plugins/`
- **Auto-discovery**: Plugins are automatically loaded on startup
- **Management API**: `/api/plugins` endpoints for enable/disable
- **Metadata**: Each plugin requires `plugin.json` or `manifest.json`
- **Database**: Plugin state stored in PostgreSQL

## API Endpoints

Key API routes:
- `/api/auth/*` - Authentication endpoints
- `/api/plugins/*` - Plugin management
- `/api/{plugin-name}/*` - Plugin-specific routes
- `/health` - Health check
- `/metrics` - Prometheus metrics
