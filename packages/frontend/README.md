# @keystone/frontend

Public-facing React application for end users.

## Overview

This package contains the frontend application responsible for:
- User interface and experience
- Client-side routing
- State management
- API integration with backend services
- Public features and functionality

## Structure

```
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API service layer
│   ├── store/        # State management
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
└── tests/            # Test suites
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Create a `.env.local` file in the package root:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=Keystone
```

## Features

- ⚡️ Vite for fast development
- 🎨 React 18 with TypeScript
- 🚀 React Router for navigation
- 📦 Zustand for state management
- 🔄 React Query for data fetching
- 🧪 Vitest for testing
