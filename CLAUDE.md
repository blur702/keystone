# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keystone is an enterprise-grade monorepo application deployed at kevinalthaus.com. It consists of a Node.js/Express backend API, React admin UI, and supporting services, all containerized with Docker and managed through Turborepo.

## Deployment Information

- **Production URL**: https://kevinalthaus.com
- **Server IP**: 65.181.112.77
- **Deployment Path**: `/var/www/kevinalthaus.com/`
- **Environment Config**: `/etc/kevinalthaus-apps/production.env`
- **Nginx Config**: `/etc/nginx/sites-available/kevinalthaus.com`
- **SSL**: Managed by Certbot with Let's Encrypt

## Architecture

### Core Services
- **PostgreSQL Database** (port 5432): Primary data store with migrations
- **Backend API** (port 3000): Express/TypeScript API at `/api/*`
- **Backend UI** (port 5174): React admin panel at `/`
- **Nginx**: System-level reverse proxy handling SSL and routing

### Authentication System
- JWT-based authentication with refresh tokens
- Login accepts either `email` or `username` field
- API endpoint: `POST /api/api/auth/login`
- Routes defined in `packages/backend/src/routes/auth.ts`
- Service logic in `packages/backend/src/core/services/AuthenticationService.ts`

### Database Schema
Key tables include:
- `users`: User accounts with email/username login support
- `sessions`: Active user sessions with JWT tokens
- `roles`, `permissions`, `user_roles`: RBAC system
- Migrations in `packages/backend/migrations/`

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Run all services in development
npm run dev

# Run specific package
npm run dev --workspace=@keystone/backend
npm run dev --workspace=@keystone/backend-ui

# Build TypeScript
cd packages/backend && npm run build
cd packages/backend-ui && npm run build
```

### Docker Operations
```bash
# Start containers (from /var/www/kevinalthaus.com)
docker compose -f docker-compose.minimal.yml up -d postgres backend backend-ui

# Rebuild and deploy backend changes
cd /var/www/kevinalthaus.com
docker compose -f docker-compose.minimal.yml build backend
docker compose -f docker-compose.minimal.yml up -d backend

# View container logs
docker logs keystone-backend -f

# Access PostgreSQL
docker exec -it keystone-postgres psql -U keystone -d keystone
```

### System Administration
```bash
# Restart nginx (after config changes)
echo '(130Bpm)' | sudo -S systemctl reload nginx

# Check service status
systemctl status nginx
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Update SSL certificates
echo '(130Bpm)' | sudo -S certbot renew
```

### Testing & Linting
```bash
# Run tests
npm test
npm run test --workspace=@keystone/backend

# Type checking
npm run type-check

# Linting
npm run lint
```

## Important File Locations

### Backend Service
- Entry point: `packages/backend/src/server.ts`
- Compiled JS: `packages/backend/dist/`
- Auth routes: `packages/backend/src/routes/auth.ts`
- Core services: `packages/backend/src/core/services/`
- Dockerfile: `packages/backend/Dockerfile`

### Backend UI
- Entry point: `packages/backend-ui/src/main.tsx`
- Build output: `packages/backend-ui/dist/`
- Nginx config: `packages/backend-ui/nginx.conf`
- Vite config: `packages/backend-ui/vite.config.ts`

### Configuration
- Docker compose: `docker-compose.minimal.yml` (production), `docker-compose.yml` (full)
- Environment vars: `/etc/kevinalthaus-apps/production.env`
- Turbo config: `turbo.json`

## Common Workflows

### Updating Backend Code
1. Edit TypeScript source in `packages/backend/src/`
2. Build: `cd packages/backend && npm run build`
3. Rebuild Docker image: `docker compose -f docker-compose.minimal.yml build backend`
4. Deploy: `docker compose -f docker-compose.minimal.yml up -d backend`

### Updating Frontend Code
1. Edit React code in `packages/backend-ui/src/`
2. Build: `cd packages/backend-ui && npm run build`
3. Rebuild Docker image: `docker compose -f docker-compose.minimal.yml build backend-ui`
4. Deploy: `docker compose -f docker-compose.minimal.yml up -d backend-ui`

### Database Operations
```bash
# Run migrations
docker exec keystone-backend npm run migrate

# Create new user via SQL
docker exec -i keystone-postgres psql -U keystone -d keystone << 'EOF'
INSERT INTO users (email, username, password_hash, first_name, last_name)
VALUES ('email', 'username', 'bcrypt_hash', 'First', 'Last');
EOF
```

### API Testing
```bash
# Health check
curl https://kevinalthaus.com/api/health

# Login
curl -X POST https://kevinalthaus.com/api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kevin","password":"(130Bpm)"}'

# Register
curl -X POST https://kevinalthaus.com/api/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"Pass123","first_name":"First","last_name":"Last"}'
```

## Notes

- The backend compiles TypeScript to JavaScript; when build fails, you may need to manually update files in `dist/`
- System nginx proxies requests, removing `/api` prefix before forwarding to backend
- Docker containers use a bridge network `keystone-network` for internal communication
- Authentication service is a singleton initialized at server start
- CORS is configured to accept requests from the production domain