# @keystone/backend-ui

Secure admin React application for protected area management.

## Overview

This package contains the administrative interface responsible for:
- Admin dashboard and controls
- User management interface
- System configuration panels
- Analytics and reporting views
- Advanced administrative features
- Role-based access control (RBAC) interface

## Structure

```
backend-ui/
├── src/
│   ├── components/   # Admin UI components
│   ├── pages/        # Admin page components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # Admin API services
│   ├── store/        # Admin state management
│   ├── guards/       # Route guards and auth
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main admin app component
│   └── main.tsx      # Application entry point
└── tests/            # Test suites
```

## Security Features

- 🔐 JWT-based authentication
- 🛡️ Role-based access control
- 🔒 Secure session management
- 📝 Audit logging
- 🚫 Protected routes
- ⏰ Session timeout handling

## Development

```bash
# Install dependencies
npm install

# Run development server (port 5174)
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
VITE_APP_TITLE=Keystone Admin
VITE_SESSION_TIMEOUT=1800000
VITE_ENABLE_MFA=true
```

## Access Control

This application implements strict access control:
- Authentication required for all routes
- Role-based permissions
- Activity logging
- Secure API communication
