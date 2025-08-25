import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a Registry
const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

const authenticationAttempts = new Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'],
  registers: [register]
});

const databaseQueries = new Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register]
});

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc();
  
  // Clean up the route path for labeling
  const route = req.route?.path || req.path || 'unknown';
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const method = req.method;
    const status = res.statusCode.toString();
    
    // Record metrics
    httpRequestsTotal.labels(method, route, status).inc();
    httpRequestDuration.labels(method, route, status).observe(duration);
    
    // Track authentication attempts
    if (route === '/auth/login') {
      const attemptStatus = res.statusCode === 200 ? 'success' : 'failure';
      authenticationAttempts.labels('login', attemptStatus).inc();
    } else if (route === '/auth/register') {
      const attemptStatus = res.statusCode === 201 ? 'success' : 'failure';
      authenticationAttempts.labels('register', attemptStatus).inc();
    }
    
    // Decrement active connections
    activeConnections.dec();
  });
  
  next();
};

// Endpoint to expose metrics
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end();
  }
};

// Export metrics for use in other parts of the application
export const metrics = {
  httpRequestsTotal,
  httpRequestDuration,
  activeConnections,
  authenticationAttempts,
  databaseQueries,
  databaseQueryDuration,
  register
};