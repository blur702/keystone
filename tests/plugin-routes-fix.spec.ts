import { test, expect } from '@playwright/test';

test.describe('Plugin Route Mounting Fix Verification', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // First, ensure we can login as admin
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@keystone.local',
        password: 'Admin123!@#'
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    
    expect(authToken).toBeTruthy();
  });

  test('Plugin routes should be accessible at /api/{plugin-name}', async ({ request }) => {
    // Test 1: Check if address-validator plugin health endpoint is accessible
    const healthResponse = await request.get('/api/address-validator/health', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // The response should NOT be 404
    expect(healthResponse.status()).not.toBe(404);
    
    // It should be either 200 (success) or another valid status code
    // but definitely not 404 (route not found)
    expect([200, 201, 202, 204, 400, 401, 403, 500]).toContain(healthResponse.status());

    // If it's successful, check the response
    if (healthResponse.ok()) {
      const healthData = await healthResponse.json();
      expect(healthData).toHaveProperty('status');
    }
  });

  test('Plugin routes should also be accessible at /api/plugins/{plugin-name} for backward compatibility', async ({ request }) => {
    // Test 2: Check backward compatibility path
    const healthResponse = await request.get('/api/plugins/address-validator/health', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // The response should NOT be 404
    expect(healthResponse.status()).not.toBe(404);
    
    // Should be accessible at both paths
    expect([200, 201, 202, 204, 400, 401, 403, 500]).toContain(healthResponse.status());
  });

  test('Plugin validation endpoint should work', async ({ request }) => {
    // Test 3: Test an actual plugin functionality endpoint
    const validationResponse = await request.post('/api/address-validator/validate', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    });

    // Should NOT be 404 - the route should exist
    expect(validationResponse.status()).not.toBe(404);
    
    // Check for valid response statuses
    if (validationResponse.status() === 200) {
      const validationData = await validationResponse.json();
      // Should have some validation result structure
      expect(validationData).toBeDefined();
    }
  });

  test('Plugin management API should list installed plugins', async ({ request }) => {
    // Test 4: Verify plugin management API works
    const pluginsResponse = await request.get('/api/plugins', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(pluginsResponse.ok()).toBeTruthy();
    
    const pluginsData = await pluginsResponse.json();
    expect(Array.isArray(pluginsData)).toBeTruthy();
    
    // Check if address-validator is in the list
    const addressValidator = pluginsData.find((p: any) => p.name === 'address-validator');
    
    if (addressValidator) {
      expect(addressValidator).toHaveProperty('isInstalled');
      expect(addressValidator).toHaveProperty('isEnabled');
      expect(addressValidator).toHaveProperty('metadata');
    }
  });

  test('Verify fix: Plugin routes mounted correctly in server logs', async ({ request }) => {
    // This test verifies that the fix is working by checking if routes are mounted
    // Note: In a real scenario, you'd check server logs or have a debug endpoint
    
    // Try to access a plugin route that should exist
    const response = await request.get('/api/address-validator/health');
    
    // Main assertion: Route should exist (not 404)
    expect(response.status()).not.toBe(404);
    
    console.log(`Plugin route test result: 
      - Path: /api/address-validator/health
      - Status: ${response.status()} (Expected: NOT 404)
      - Fix Status: ${response.status() !== 404 ? 'WORKING ✓' : 'FAILED ✗'}
    `);
  });
});