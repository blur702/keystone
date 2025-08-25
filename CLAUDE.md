# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keystone is an enterprise-grade monorepo application deployed at kevinalthaus.com. It's a full-stack platform with authentication, RBAC, and admin dashboard capabilities, built with TypeScript, React, and PostgreSQL.

## Deployment Information

- **Production URL**: https://kevinalthaus.com
- **Server IP**: 65.181.112.77
- **Deployment Path**: `/var/www/kevinalthaus.com/`
- **Environment Config**: `/etc/kevinalthaus-apps/production.env`
- **Nginx Config**: `/etc/nginx/sites-available/kevinalthaus.com`
- **SSL**: Managed by Certbot with Let's Encrypt
- **Git Repository**: Local at `/var/www/kevinalthaus.com/` (branch: main)

## Architecture

### Monorepo Structure
```
packages/
├── backend/          # Node.js/Express API server
├── backend-ui/       # React admin dashboard
├── frontend/         # Public-facing React app (not deployed)
└── python-services/  # Python microservices (not deployed)
```

### Core Services & Ports
- **PostgreSQL Database** (port 5432): Primary data store with migrations
- **Backend API** (port 3000): Express/TypeScript API, accessed via `/api/*`
- **Backend UI** (port 5174): React admin panel, served at root `/`
- **Nginx**: System-level reverse proxy (ports 80/443)
  - Strips `/api` prefix when proxying to backend
  - Routes `/api/*` → `localhost:3000/*`
  - Routes `/` → `localhost:5174/`

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Login accepts either `email` or `username`
- API endpoint: `POST /api/auth/login` (Note: nginx adds `/api` prefix)
- Auth routes: `packages/backend/src/routes/auth.ts` mounted at `/auth`
- Service: `packages/backend/src/core/services/AuthenticationService.ts`
- RBAC permissions format: `resource:action` (e.g., `users:manage`)

### Frontend Architecture
- **Router**: React Router v6 with protected routes
- **State Management**: React Context (AuthContext)
- **UI Framework**: Material-UI v5
- **Build Tool**: Vite
- **Theme**: Light/Dark mode support with MUI theming

### Backend Architecture
- **Framework**: Express with TypeScript
- **Database**: PostgreSQL with raw SQL queries
- **Authentication**: JWT with bcrypt password hashing
- **Services**: Singleton pattern for core services
- **Migrations**: SQL files in `packages/backend/migrations/`

## Essential Commands

### Development
```bash
# Install all dependencies (from project root)
npm install

# Run all services in development
npm run dev

# Run specific package in dev mode
npm run dev --workspace=@keystone/backend
npm run dev --workspace=@keystone/backend-ui

# Build TypeScript (backend)
cd packages/backend && npm run build

# Build React app (backend-ui) with correct API URL
cd packages/backend-ui && VITE_API_URL=/api npx vite build
```

### Docker Operations
```bash
# Start all containers (from /var/www/kevinalthaus.com)
docker compose -f docker-compose.minimal.yml up -d postgres backend backend-ui

# Rebuild and deploy backend
docker compose -f docker-compose.minimal.yml build backend
docker compose -f docker-compose.minimal.yml up -d backend

# Rebuild and deploy frontend
docker compose -f docker-compose.minimal.yml build backend-ui
docker compose -f docker-compose.minimal.yml up -d backend-ui

# View logs
docker logs keystone-backend -f
docker logs keystone-backend-ui -f
docker logs keystone-postgres -f

# Access PostgreSQL
docker exec -it keystone-postgres psql -U keystone -d keystone

# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### System Administration
```bash
# Nginx operations (password: (130Bpm))
echo '(130Bpm)' | sudo -S systemctl reload nginx
echo '(130Bpm)' | sudo -S systemctl restart nginx
echo '(130Bpm)' | sudo -S nginx -t

# Check service status
systemctl status nginx

# Update SSL certificates
echo '(130Bpm)' | sudo -S certbot renew

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Testing & Validation
```bash
# Run tests
npm test
npm run test --workspace=@keystone/backend

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Common Workflows

### Adding a New API Endpoint
1. Add route handler in `packages/backend/src/routes/`
2. Update route mounting in `packages/backend/src/server.ts`
3. Build: `cd packages/backend && npm run build`
4. Rebuild container: `docker compose -f docker-compose.minimal.yml build backend`
5. Deploy: `docker compose -f docker-compose.minimal.yml up -d backend`

### Adding a New Frontend Page
1. Create component in `packages/backend-ui/src/pages/`
2. Add route in `packages/backend-ui/src/App.tsx`
3. Update navigation in `WelcomePage.tsx` if needed
4. Build: `cd packages/backend-ui && VITE_API_URL=/api npx vite build`
5. Rebuild container: `docker compose -f docker-compose.minimal.yml build backend-ui`
6. Deploy: `docker compose -f docker-compose.minimal.yml up -d backend-ui`

### Database Schema Changes
```bash
# Create migration file
echo "CREATE TABLE ..." > packages/backend/migrations/003_new_table.sql

# Apply migration manually
docker exec -i keystone-postgres psql -U keystone -d keystone < packages/backend/migrations/003_new_table.sql

# Update user password (example)
docker exec -i keystone-postgres psql -U keystone -d keystone << 'EOF'
UPDATE users SET password_hash = 'bcrypt_hash' WHERE username = 'kevin';
EOF
```

### API Testing
```bash
# Health check
curl https://kevinalthaus.com/api/health

# Login (note the double /api due to nginx routing)
curl -X POST https://kevinalthaus.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kevin","password":"(130Bpm)"}'

# Register new user
curl -X POST https://kevinalthaus.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","username":"user","password":"Pass123","first_name":"First","last_name":"Last"}'
```

### Git Operations
```bash
cd /var/www/kevinalthaus.com

# Check status
git status

# Commit changes
git add .
git commit -m "feat: Your feature description"

# View history
git log --oneline -10
```

## Current Implementation Status

### Completed Features
- ✅ User authentication (JWT with email/username login)
- ✅ RBAC foundation (roles, permissions tables)
- ✅ Admin dashboard with Quick Actions
- ✅ User management page (CRUD operations)
- ✅ Role management page
- ✅ System settings page
- ✅ Dark/Light theme toggle
- ✅ Docker containerization
- ✅ SSL/HTTPS configuration

### Frontend Routes
- `/login` - Login page
- `/` - Dashboard/Welcome page
- `/users` - User management
- `/roles` - Role & permission management
- `/settings` - System settings

### Known Issues & Workarounds
1. **TypeScript Build Failures**: If backend TypeScript won't compile, manually edit files in `dist/` directory
2. **Frontend Cache**: Browser may cache old frontend; use Ctrl+Shift+R to force reload
3. **API Route Confusion**: Remember that nginx strips `/api` prefix, so backend routes are mounted without it
4. **Password**: System sudo password is `(130Bpm)`

## Important Notes

- Frontend builds require `VITE_API_URL=/api` environment variable
- Backend routes are mounted at `/auth`, not `/api/auth` (nginx handles the prefix)
- Docker containers use `keystone-network` bridge network
- Authentication service is a singleton initialized at server start
- CORS is configured for production domain
- Admin user (`kevin`) is protected from deletion in the UI
- Mock data is used for users/roles until API endpoints are implemented