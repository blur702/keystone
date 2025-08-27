# CLAUDE.md - Keystone Project Guide

## Overview
Keystone is an enterprise-grade monorepo application with a plugin architecture, built using Turborepo. It consists of a public frontend, admin backend UI, Node.js API server, and Python services. The system supports dynamic plugin loading and management through a comprehensive UI.

## Quick Reference

### Common Commands
```bash
# Development
npm run dev                # Start all services
npm run build             # Build all packages
npm run test              # Run tests
npm run lint              # Lint code
npm run type-check        # TypeScript type checking

# Backend specific (from packages/backend)
npm run dev --workspace=@keystone/backend     # Run backend only
npm start                 # Start production server (after build)

# Admin UI specific (from packages/backend-ui) 
npm run dev --workspace=@keystone/backend-ui  # Run admin UI only
npm run build --workspace=@keystone/backend-ui # Build admin UI

# Frontend specific (from packages/frontend)
npm run dev --workspace=@keystone/frontend    # Run frontend only
npm run build --workspace=@keystone/frontend  # Build frontend
```

### Key URLs & Access
- **Public Frontend**: https://kevinalthaus.com/
- **Admin Backend**: https://kevinalthaus.com/admin/
- **API**: https://kevinalthaus.com/api/
- **Grafana**: https://kevinalthaus.com/grafana/
- **Login**: kevin / (130Bpm)
- **Sudo Password**: (130Bpm)

## Architecture

### Directory Structure
```
/home/kevin/keystone/
├── packages/
│   ├── backend/          # Node.js API server (port 3000)
│   ├── backend-ui/       # Admin React app (dev port 5174)
│   ├── frontend/         # Public React app (dev port 5173)
│   └── python-services/  # Python calculation services
├── turbo.json           # Turborepo configuration
└── package.json         # Root monorepo config
```

### Deployment Locations
```
/var/www/kevinalthaus.com/
├── public/              # Public frontend files
├── admin/               # Admin UI files
│   ├── index.html
│   └── assets/         # Built JS/CSS files
```

### Database
- **Type**: PostgreSQL
- **Database**: keystone
- **User**: keystone  
- **Password**: keystone-dev-2024
- **Plugins Table**: Stores plugin metadata and configuration

### Environment Variables
Key environment variables in `packages/backend/.env`:
- **Database**: `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=keystone`, `DB_USER=keystone`, `DB_PASSWORD=keystone-dev-2024`
- **Redis**: `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=redis`
- **JWT**: `JWT_SECRET=keystone-jwt-secret-dev-2024-very-long-string`, `JWT_EXPIRES_IN=15m`
- **Email**: `BREVO_API_KEY` configured in .env file
- **Google**: `GOOGLE_API_KEY` configured in .env file
- **OAuth**: `OAUTH_CONSUMER_KEY`, `OAUTH_CONSUMER_SECRET` configured in .env file
- **USPS**: Customer Registration ID and Mailer IDs configured in .env file
- **CORS**: `CORS_ORIGIN=http://localhost:5173,http://localhost:5174,https://kevinalthaus.com`

## Plugin System

### Plugin Architecture
The plugin system is implemented in `/home/kevin/keystone/packages/backend/src/core/PluginLoader.ts` and provides:

1. **Dynamic Loading**: Plugins are discovered and loaded from `packages/backend/src/plugins/`
2. **Metadata**: Each plugin requires a `plugin.json` or `manifest.json` file
3. **Route Mounting**: Plugin routes are automatically mounted at `/api/{plugin-name}/`
4. **Database Storage**: Plugin state stored in PostgreSQL `plugins` table
5. **UI Management**: Admin UI at `/admin/plugins` for enable/disable functionality

### Plugin Structure
```
packages/backend/src/plugins/{plugin-name}/
├── plugin.json          # Plugin metadata
├── index.js            # Main plugin file
└── routes/             # Plugin API routes
```

### Plugin Metadata Format
```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author name",
  "dependencies": ["dependency1"],
  "routes": ["routes/api.js"],
  "permissions": ["plugins:read"]
}
```

### Key Plugin Files
- **PluginLoader**: `/home/kevin/keystone/packages/backend/src/core/PluginLoader.ts`
- **Plugin Routes**: `/home/kevin/keystone/packages/backend/src/routes/plugins.ts`
- **Plugin UI**: `/home/kevin/keystone/packages/backend-ui/src/pages/PluginsPage.tsx`
- **Example Plugin**: `/home/kevin/keystone/packages/backend/src/plugins/address-validator/`

## Authentication & Security

### JWT Authentication
- **Secret**: Configured in `JWT_SECRET` environment variable
- **Expiry**: 15 minutes (access token), 7 days (refresh token)
- **Endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`

### RBAC System
System roles defined in `AuthenticationService`:
- `super_admin`: Full system access
- `admin`: Administrative access (required for plugin management)
- `user`: Regular user access
- `guest`: Limited access

### Permissions Format
Permissions follow `resource:action` format:
- `plugins:install`, `plugins:enable`, `plugins:disable`
- `users:create`, `users:read`, `users:update`, `users:delete`
- `roles:create`, `roles:read`, `roles:update`, `roles:delete`

## Core Services

### Backend Services (packages/backend/src/core/services/)
1. **AuthenticationService**: JWT auth, RBAC, session management
2. **DatabaseService**: PostgreSQL and Redis connections
3. **EventBusService**: Inter-service event communication
4. **EmailService**: Brevo (SendinBlue) email integration with API key in .env
5. **ExternalAPIService**: Third-party API management
6. **PluginService**: Plugin CRUD operations

### Service Initialization
Services are initialized in `packages/backend/src/server.ts`:
1. Database connection established
2. Core services instantiated as singletons
3. Plugin system initialized
4. Routes mounted (auth → plugins → 404 handler)

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with pg library
- **Cache**: Redis with ioredis
- **Auth**: JWT with jsonwebtoken, bcryptjs
- **Validation**: Joi, express-validator
- **Logging**: Winston
- **Testing**: Jest

### Admin UI (backend-ui)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (base path: /admin/)
- **UI Library**: Material-UI (@mui)
- **State**: Zustand, React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **HTTP**: Axios
- **Testing**: Vitest

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest

### Infrastructure
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt certificates
- **Process Manager**: Systemd or PM2
- **Monorepo**: Turborepo

## Nginx Configuration

Location: `/etc/nginx/sites-available/kevinalthaus.com`

Key routes:
- `/admin/*` → Serves admin UI from `/var/www/kevinalthaus.com/admin/`
- `/api/*` → Proxies to backend at `http://localhost:3000/`
- `/auth/*` → Proxies to auth endpoints
- `/grafana/*` → Proxies to Grafana at port 3001
- `/` → Serves public frontend from `/var/www/kevinalthaus.com/public/`

## Important Configuration Files

### Backend Configuration
- **Main Server**: `packages/backend/src/server.ts`
- **Environment**: `packages/backend/.env` (not tracked)
- **TypeScript**: `packages/backend/tsconfig.json`

### Admin UI Configuration  
- **Entry Point**: `packages/backend-ui/src/main.tsx`
- **Vite Config**: `packages/backend-ui/vite.config.ts` (base: '/admin/')
- **App Router**: `packages/backend-ui/src/App.tsx`

### API Configuration
- **Auth Service**: `packages/backend/src/core/services/AuthenticationService.ts`
- **Plugin Loader**: `packages/backend/src/core/PluginLoader.ts`

## Testing

### Test Script
Location: `/home/kevin/keystone/final-test.sh`

Tests:
1. Public frontend accessibility
2. Admin backend loading
3. Admin assets (CSS/JS) loading
4. API endpoint responses
5. Backend process status

Run with: `bash /home/kevin/keystone/final-test.sh`

## Deployment Process

### Building for Production
```bash
# From project root
npm run build                          # Build all packages
```

### Deploying Admin UI
```bash
cd packages/backend-ui
npm run build                          # Creates dist/ folder
sudo cp -r dist/* /var/www/kevinalthaus.com/admin/
sudo systemctl reload nginx
```

### Deploying Frontend
```bash
cd packages/frontend  
npm run build                          # Creates dist/ folder
sudo cp -r dist/* /var/www/kevinalthaus.com/public/
sudo systemctl reload nginx
```

### Starting Backend
```bash
cd packages/backend
npm run build                          # Compile TypeScript
npm start                              # Start production server
# OR with PM2
pm2 start dist/server.js --name keystone-backend
```

## Troubleshooting

### Common Issues

1. **QueryClient Error in Admin UI**
   - Ensure QueryClientProvider wraps the app in `main.tsx`
   - Check that @tanstack/react-query is installed

2. **Plugin Routes Not Found**
   - Check plugin.json/manifest.json exists
   - Verify routes array in metadata
   - Ensure plugin is enabled in database
   - Check server.ts for route mounting logic

3. **Admin UI Not Loading** 
   - Verify nginx server_name matches domain
   - Use domain name, not localhost for testing
   - Check /admin/ location block in nginx
   - Ensure vite.config.ts has base: '/admin/'

4. **Authentication Issues**
   - Check JWT_SECRET environment variable
   - Verify user has admin role for plugin access
   - Check token expiry (15 minutes default)

### Debug Commands
```bash
# Check backend logs
journalctl -u keystone-backend -f

# Test nginx config
sudo nginx -t

# Check plugin database
psql -U keystone -d keystone -c "SELECT * FROM plugins;"

# Test API endpoints
curl -X POST https://kevinalthaus.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## Key Implementation Notes

1. **Plugin Loading**: PluginLoader handles both array and object dependency structures in metadata
2. **React Query**: Admin UI requires QueryClientProvider wrapper for state management
3. **Nginx Routing**: Must use domain name (kevinalthaus.com) not localhost due to server_name matching
4. **Base Path**: Admin UI built with /admin/ base path for proper asset loading
5. **Authentication**: Admin role required for plugin management operations

## Recent Changes

1. **Admin/Frontend Separation**: Admin UI moved to /admin/, public frontend at /
2. **QueryClient Fix**: Added QueryClientProvider to fix React Query initialization
3. **Plugin System**: Fixed dependency checking, added UI management page
4. **Nginx Configuration**: Updated to serve separate admin and public areas
5. **Build Process**: Configured Vite with proper base paths for deployment