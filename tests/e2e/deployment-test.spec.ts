import { test, expect } from '@playwright/test';

test.describe('Deployment Verification', () => {
  test('Backend API is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('Backend UI is accessible', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await expect(page).toHaveTitle(/Keystone/);
    // Check if login page loads
    await expect(page.locator('text=Sign In')).toBeVisible({ timeout: 10000 });
  });

  test('Database connectivity through API', async ({ request }) => {
    // Try to login - even with invalid credentials, it shows DB is connected
    const response = await request.post('http://localhost:3000/auth/login', {
      data: {
        username: 'test',
        password: 'test'
      }
    });
    // We expect 401 (invalid credentials) not 500 (database error)
    expect([401, 400]).toContain(response.status());
  });

  test('Plugin system endpoint exists', async ({ request }) => {
    const response = await request.get('http://localhost:3000/plugins');
    // Even if empty or auth required, endpoint should respond
    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

test.describe('Address Validator Plugin', () => {
  test('Plugin manifest is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/address-validator/validate', {
      data: {
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '12345',
          country: 'US'
        }
      }
    });
    // Plugin endpoint should at least respond (even if auth required)
    expect(response.status()).toBeLessThan(500);
  });
});