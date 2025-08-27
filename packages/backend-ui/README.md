# @keystone/backend-ui

Secure admin React application for protected area management, deployed at https://kevinalthaus.com/admin/

## Overview

This package contains the administrative interface responsible for:
- Admin dashboard and controls
- Plugin management interface (/admin/plugins)
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

# Build for production (with /admin/ base path)
npm run build

# Deploy to production
sudo cp -r dist/* /var/www/kevinalthaus.com/admin/
sudo systemctl reload nginx
```

## Environment Variables

Create a `.env.local` file in the package root:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_TITLE=Keystone Admin
VITE_SESSION_TIMEOUT=1800000
VITE_ENABLE_MFA=true
```

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (configured with /admin/ base path)
- **UI Library**: Material-UI (@mui)
- **State Management**: Zustand, React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router v6
- **HTTP Client**: Axios

## Access Control

This application implements strict access control:
- Authentication required for all routes
- Admin role required for plugin management
- Role-based permissions (RBAC)
- JWT token authentication
- Activity logging
- Secure API communication
