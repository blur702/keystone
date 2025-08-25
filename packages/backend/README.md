# @keystone/backend

Node.js backend application providing core business logic and API services.

## Overview

This package contains the backend application layer responsible for:
- RESTful API endpoints
- Business logic implementation
- Database interactions
- Authentication and authorization
- Integration with external services
- Communication with Python calculation services

## Structure

```
backend/
├── src/
│   ├── api/          # API route definitions
│   ├── services/     # Business logic services
│   ├── models/       # Data models and schemas
│   ├── middleware/   # Express middleware
│   ├── utils/        # Utility functions
│   └── index.ts      # Application entry point
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
DATABASE_URL=postgresql://user:pass@localhost:5432/keystone
JWT_SECRET=your-secret-key
PYTHON_SERVICE_URL=http://localhost:8000
```

## API Documentation

API documentation is available at `/api/docs` when running in development mode.
