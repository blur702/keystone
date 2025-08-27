# Keystone Monorepo

Enterprise-grade monorepo application built with Turborepo.

## 🏗️ Architecture

This monorepo contains multiple packages that work together to form the complete Keystone application:

- **`@keystone/backend`** - Node.js backend API with plugin system (Port 3000)
- **`@keystone/frontend`** - Public-facing React application (https://kevinalthaus.com/)
- **`@keystone/backend-ui`** - Admin React application (https://kevinalthaus.com/admin/)
- **`@keystone/python-services`** - Python calculation and data processing services

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- Nginx
- Git

### Installation

```bash
# Install dependencies
npm install

# Install Python dependencies (in python-services)
cd packages/python-services
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### Development

```bash
# Run all services in development mode
npm run dev

# Run specific package
npm run dev --workspace=@keystone/backend
npm run dev --workspace=@keystone/frontend
npm run dev --workspace=@keystone/backend-ui
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@keystone/frontend
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
keystone/
├── docs/                 # Project documentation
├── packages/
│   ├── backend/          # Node.js backend service with plugin system
│   │   └── src/
│   │       ├── core/     # Core services (Auth, DB, Email, Plugin)
│   │       ├── plugins/  # Dynamic plugin modules
│   │       └── routes/   # API routes
│   ├── frontend/         # Public React application
│   ├── backend-ui/       # Admin React application
│   └── python-services/  # Python calculation services
├── CLAUDE.md            # AI assistant context documentation
├── turbo.json           # Turborepo configuration
├── package.json         # Root package configuration
└── README.md            # This file
```

## 🛠️ Technology Stack

- **Monorepo Tool**: Turborepo
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis
- **Frontend**: React 18, TypeScript, Vite, Material-UI
- **Admin UI**: React 18, Material-UI, React Query, React Router v6
- **Authentication**: JWT, bcrypt, Role-Based Access Control (RBAC)
- **Plugin System**: Dynamic module loading with dependency management
- **Email Service**: Brevo (SendinBlue) integration
- **Python Services**: FastAPI, NumPy, Pandas
- **Testing**: Jest, Vitest, Pytest
- **Code Quality**: ESLint, Prettier, Black, Flake8
- **Infrastructure**: Nginx, Let's Encrypt SSL, Systemd/PM2

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run format` | Format all code |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean all build artifacts |

## 🔧 Configuration

Each package has its own configuration files:
- `package.json` - Package dependencies and scripts
- `tsconfig.json` - TypeScript configuration (JS packages)
- `vite.config.ts` - Vite configuration (React packages)
- `.env` - Environment variables (backend service)
- `requirements.txt` - Python dependencies (Python services)

### Key Environment Variables
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` - JWT authentication
- `BREVO_API_KEY` - Email service integration
- `CORS_ORIGIN` - Allowed CORS origins

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project guide for AI assistants
- **[Plugin System Guide](./packages/backend/src/plugins/README.md)** - Plugin development documentation
- Additional documentation in `/docs` directory (if available)

## 🔌 Plugin System

Keystone features a dynamic plugin system that allows extending functionality:

- **Plugin Management UI**: Available at `/admin/plugins`
- **Plugin Directory**: `packages/backend/src/plugins/`
- **Auto-discovery**: Plugins are automatically discovered on server startup
- **Dependency Management**: Automatic dependency resolution
- **Hot Loading**: Enable/disable plugins without server restart
- **Database Persistence**: Plugin state stored in PostgreSQL

## 🌐 Deployment

- **Public Frontend**: https://kevinalthaus.com/
- **Admin Panel**: https://kevinalthaus.com/admin/
- **API Endpoints**: https://kevinalthaus.com/api/
- **Grafana Monitoring**: https://kevinalthaus.com/grafana/

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using Turborepo
