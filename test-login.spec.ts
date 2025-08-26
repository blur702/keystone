import { test, expect } from '@playwright/test';

test('login should work with valid credentials', async ({ page }) => {
  // Go to login page
  await page.goto('https://kevinalthaus.com/login');
  
  // Wait for the form to load
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  
  // Fill in credentials
  await page.fill('input[name="email"]', 'admin@kevinalthaus.com');
  await page.fill('input[name="password"]', 'admin123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation or error
  await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {}),
    page.waitForURL('**/', { timeout: 5000 }).catch(() => {}),
    page.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {})
  ]);
  
  // Check if we're logged in by looking for the token
  const token = await page.evaluate(() => localStorage.getItem('token'));
  
  if (token) {
    console.log('✅ Login successful! Token:', token.substring(0, 50) + '...');
  } else {
    const errorElement = await page.$('[role="alert"]');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('❌ Login failed with error:', errorText);
    } else {
      console.log('❌ Login failed - no token found');
    }
  }
  
  expect(token).toBeTruthy();
});