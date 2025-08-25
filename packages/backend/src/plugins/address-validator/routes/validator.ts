/**
 * Address Validator Plugin Routes
 * Defines all API endpoints for address validation functionality
 */

import { PluginRoute } from '../../../core/PluginSystem';

export const routes: PluginRoute[] = [
  // Core validation endpoints
  {
    path: '/validate',
    method: 'POST',
    handler: 'validateAddress',
    permissions: ['addresses:validate'],
    middleware: ['rateLimitMiddleware'],
    description: 'Validate a single postal address'
  },
  {
    path: '/validate-batch',
    method: 'POST', 
    handler: 'validateBatch',
    permissions: ['addresses:validate'],
    middleware: ['rateLimitMiddleware', 'batchLimitMiddleware'],
    description: 'Validate multiple addresses in batch (max 100)'
  },
  {
    path: '/standardize',
    method: 'POST',
    handler: 'standardizeAddress', 
    permissions: ['addresses:standardize'],
    middleware: ['rateLimitMiddleware'],
    description: 'Standardize address format without validation'
  },
  {
    path: '/geocode',
    method: 'POST',
    handler: 'geocodeAddress',
    permissions: ['addresses:validate', 'external-api:access'],
    middleware: ['rateLimitMiddleware'],
    description: 'Convert address to geographic coordinates'
  },
  
  // Information endpoints
  {
    path: '/countries',
    method: 'GET',
    handler: 'getSupportedCountries',
    permissions: ['data:read'],
    description: 'Get list of supported countries for validation'
  },
  {
    path: '/health',
    method: 'GET', 
    handler: 'getHealth',
    permissions: ['data:read'],
    description: 'Get plugin health status and provider availability'
  },
  {
    path: '/metrics',
    method: 'GET',
    handler: 'getMetrics',
    permissions: ['data:read'],
    description: 'Get validation metrics and statistics'
  },
  
  // Cache management
  {
    path: '/cache',
    method: 'DELETE',
    handler: 'clearCache',
    permissions: ['addresses:validate', 'data:write'],
    description: 'Clear validation cache'
  }
];

export default routes;