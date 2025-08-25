# Keystone Monorepo

Enterprise-grade monorepo application built with Turborepo.

## 🏗️ Architecture

This monorepo contains multiple packages that work together to form the complete Keystone application:

- **`@keystone/backend`** - Node.js backend API and business logic
- **`@keystone/frontend`** - Public-facing React application
- **`@keystone/backend-ui`** - Secure admin React application
- **`@keystone/python-services`** - Python calculation and data processing services

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
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
│   ├── backend/          # Node.js backend service
│   ├── frontend/         # Public React application
│   ├── backend-ui/       # Admin React application
│   └── python-services/  # Python calculation services
├── turbo.json            # Turborepo configuration
├── package.json          # Root package configuration
└── README.md             # This file
```

## 🛠️ Technology Stack

- **Monorepo Tool**: Turborepo
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Python Services**: FastAPI, NumPy, Pandas
- **Testing**: Jest, Vitest, Pytest
- **Code Quality**: ESLint, Prettier, Black, Flake8

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run format` | Format all code |
| `npm run clean` | Clean all build artifacts |

## 🔧 Configuration

Each package has its own configuration files:
- `package.json` - Package dependencies and scripts
- `tsconfig.json` - TypeScript configuration (JS packages)
- `vite.config.ts` - Vite configuration (React packages)
- `requirements.txt` - Python dependencies (Python services)

## 📚 Documentation

Detailed documentation is available in the `/docs` directory:
- [Architecture Overview](./docs/architecture/overview.md)
- [Getting Started Guide](./docs/guides/getting-started.md)
- [API Reference](./docs/api/reference.md)

## 🤝 Contributing

Please read our [Contributing Guide](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using Turborepo
