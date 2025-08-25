# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Information
- sudo password: (130Bpm)
- Production domain: https://kevinalthaus.com
- Testing domain: https://pw.kevinalthaus.com
- Production deployment: /var/www/kevinalthaus.com
- Testing deployment: /var/www/pw.kevinalthaus.com

## Essential Commands

### Development
```bash
# Start all services in development mode with hot reload
npm run dev

# Start specific service only
npm run dev --workspace=@keystone/backend
npm run dev --workspace=@keystone/frontend
npm run dev --workspace=@keystone/backend-ui

# Run a single test file
npm test -- path/to/test.spec.ts
npm run test --workspace=@keystone/backend -- auth.test.ts
```

### Building & Deployment
```bash
# Build all packages (uses Turborepo caching)
npm run build

# Deploy to production (from /var/www/kevinalthaus.com)
docker compose -f docker-compose.minimal.yml build
docker compose -f docker-compose.minimal.yml up -d

# Deploy with full monitoring stack
docker compose -f docker-compose.yml up -d

# Restart specific service
docker compose -f docker-compose.minimal.yml restart backend
```

### Database Operations
```bash
# Access production database
docker exec -it keystone-postgres psql -U keystone -d keystone

# Run migrations
docker exec keystone-backend node dist/migrate.js

# Create backup
docker exec keystone-postgres pg_dump -U keystone keystone > backup.sql
```

### Testing & Quality
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Lint and format
npm run lint
npm run format

# Type checking
npm run typecheck
```

### Monitoring & Logs
```bash
# View backend logs
docker logs -f keystone-backend

# Access Grafana dashboard
# https://kevinalthaus.com/grafana/ (guest access enabled)

# Access Prometheus metrics
# https://kevinalthaus.com/prometheus/
```

## Architecture Overview

### Service Communication Flow
```
Internet → Nginx (SSL) → Services
                      ├→ Backend API (port 3000)
                      ├→ Frontend UI (port 5173)
                      ├→ Backend UI (port 5174)
                      ├→ Grafana (port 3001)
                      └→ Prometheus (port 9090)

Backend API → PostgreSQL (port 5432)
           → Redis (port 6379)
           → Python Services (port 8000)
```

### Plugin System Architecture
The platform uses a dynamic plugin system where plugins:
1. Are loaded from `/packages/backend/src/plugins/` at runtime
2. Register in the database with metadata and permissions
3. Can hook into system events via EventBus
4. Store settings in `plugin_settings` table
5. Require specific permissions (format: `plugin:pluginName:action`)

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- RBAC with format: `resource:action` (e.g., `users:create`, `analytics:view`)
- Session management in PostgreSQL (not Redis in minimal deployment)
- Auth middleware validates tokens and checks permissions
- Grafana uses auth proxy with Keystone authentication

### Database Migration Strategy
1. Migrations are in `/packages/backend/migrations/` as numbered SQL files
2. Applied sequentially on container startup
3. Core tables: users, roles, permissions, plugins, events, email_templates
4. Uses PostgreSQL triggers for audit logging
5. PostGIS enabled for spatial data

### Email System Architecture
- Brevo (SendInBlue) API for transactional emails
- Inbound webhook processing at `/api/email/webhook`
- Email templates stored in database
- Complete email event tracking (sent, delivered, opened, clicked)
- Rate limiting: 300 emails/day by default

### Docker Deployment Patterns
Two deployment configurations:

**Minimal (docker-compose.minimal.yml)** - Production use:
- PostgreSQL, Backend, Frontend, Backend-UI, Nginx
- No Redis, monitoring handled separately
- Simplified for resource efficiency

**Full (docker-compose.yml)** - Development/Monitoring:
- Includes all minimal services plus:
- Redis, Prometheus, Grafana, Loki, Promtail
- Node Exporter, PostgreSQL Exporter
- Complete observability stack

### Critical File Locations
- Backend TypeScript → `/packages/backend/src/`
- Compiled Backend → `/packages/backend/dist/`
- When backend won't compile: Copy .ts files directly to .js in dist/
- Nginx config → `/etc/nginx/sites-available/kevinalthaus.com`
- SSL certificates → `/etc/letsencrypt/live/kevinalthaus.com/`
- Database migrations → `/packages/backend/migrations/`

## Known Issues & Workarounds

### Backend TypeScript Compilation
If TypeScript compilation fails due to missing types:
```bash
# Install missing type definitions
npm install --save-dev @types/bcryptjs @types/jsonwebtoken @types/uuid

# If compilation still fails, copy source files as JavaScript
cp packages/backend/src/routes/newfile.ts packages/backend/dist/routes/newfile.js
# Then manually convert TypeScript to JavaScript syntax
```

### Docker Container Updates
When adding new files to backend:
1. Files must be in dist/ folder
2. Rebuild Docker image: `docker compose build backend`
3. Recreate container: `docker compose up -d backend`

### Nginx Configuration Changes
```bash
# Always test configuration first
echo "(130Bpm)" | sudo -S nginx -t

# Then reload
echo "(130Bpm)" | sudo -S systemctl reload nginx
```

## Service-Specific Notes

### Backend Service
- Express server with comprehensive middleware stack
- Database service uses connection pooling (max 20 connections)
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics` (Prometheus format)
- Activity logging middleware tracks all API calls

### Frontend Services
- Both use Vite for fast development and optimized builds
- Backend-UI requires authentication, Frontend is public
- React Query for server state management
- Environment variables injected at build time

### Python Services
- FastAPI with async support
- Calculation endpoints for complex processing
- Uses SQLAlchemy for database operations
- Deployed via Uvicorn in Docker

### Monitoring Stack
- Prometheus scrapes metrics every 15s
- Grafana dashboards auto-provisioned
- Loki aggregates logs from all containers
- Alerts configured in `/monitoring/prometheus/alerts.yml`

## Security Considerations
- All secrets in environment variables
- HTTPS enforced via Nginx redirect
- Rate limiting on API endpoints
- CORS configured per environment
- Security headers (HSTS, CSP, X-Frame-Options)
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping