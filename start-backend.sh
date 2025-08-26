#!/bin/bash

# Set environment variables
export NODE_ENV=production
export PORT=3000
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=keystone
export DB_USER=keystone
export DB_PASSWORD="keystone-dev-2024"
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD="redis"
export JWT_SECRET="keystone-jwt-secret-dev-2024-very-long-string"
export JWT_EXPIRES_IN=15m
export REFRESH_TOKEN_EXPIRES_IN=7d
export BCRYPT_ROUNDS=10
export SESSION_TIMEOUT=86400000
export CORS_ORIGIN="https://kevinalthaus.com,http://localhost:5173"
export LOG_LEVEL=info

# Change to backend directory
cd /home/kevin/keystone/packages/backend

# Start the backend
exec node dist/server.js