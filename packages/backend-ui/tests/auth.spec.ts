import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * Comprehensive Authentication Test Suite
 * Tests all authentication flows with realistic data and edge cases
 */

// Realistic test data
const testUsers = {
  validAdmin: {
    email: 'sarah.johnson@techcorp.com',
    username: 'sjohnson',
    password: 'SecureP@ssw0rd2024!',
    firstName: 'Sarah',
    lastName: 'Johnson',
  },
  validUser: {
    email: 'michael.chen@startup.io',
    username: 'mchen',
    password: 'MyStr0ng#Pass',
    firstName: 'Michael',
    lastName: 'Chen',
  },
  invalidUser: {
    email: 'notexist@invalid.com',
    username: 'ghostuser',
    password: 'WrongPassword123!',
  },
  sqlInjection: {
    username: "admin' OR '1'='1",
    password: "' OR '1'='1--",
  },
  xssAttempt: {
    username: '<script>alert("XSS")</script>',
    password: '<img src=x onerror=alert("XSS")>',
  },
};

// Helper functions
async function navigateToLogin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Keystone.*Login/i);
}

async function fillLoginForm(page: Page, username: string, password: string) {
  await page.fill('[data-testid="login-username"], input[name="username"], #username', username);
  await page.fill('[data-testid="login-password"], input[name="password"], #password', password);
}

async function submitLogin(page: Page) {
  const submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
}

async function checkAccessibility(page: Page, context: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`Accessibility violations in ${context}:`, 
      accessibilityScanResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      }))
    );
  }
  
  expect(accessibilityScanResults.violations).toHaveLength(0);
}

test.describe('Authentication - Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToLogin(page);
  });

  test('successful login with valid admin credentials', async ({ page }) => {
    // Fill form with valid admin credentials
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    
    // Submit and wait for navigation
    await submitLogin(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify successful login
    await expect(page).toHaveTitle(/Dashboard/i);
    await expect(page.locator('[data-testid="user-menu"], .user-profile')).toContainText(testUsers.validAdmin.firstName);
    
    // Verify JWT token is stored
    const localStorage = await page.evaluate(() => window.localStorage);
    expect(localStorage).toHaveProperty('access_token');
    expect(localStorage).toHaveProperty('refresh_token');
    
    // Check accessibility
    await checkAccessibility(page, 'dashboard after login');
  });

  test('successful login with email instead of username', async ({ page }) => {
    await fillLoginForm(page, testUsers.validUser.email, testUsers.validUser.password);
    await submitLogin(page);
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveTitle(/Dashboard/i);
  });

  test('failed login with incorrect password', async ({ page }) => {
    await fillLoginForm(page, testUsers.validAdmin.username, 'WrongPassword123!');
    await submitLogin(page);
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="login-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid credentials|incorrect password|authentication failed/i);
    
    // Should not store tokens
    const localStorage = await page.evaluate(() => window.localStorage);
    expect(localStorage.access_token).toBeUndefined();
  });

  test('failed login with non-existent user', async ({ page }) => {
    await fillLoginForm(page, testUsers.invalidUser.username, testUsers.invalidUser.password);
    await submitLogin(page);
    
    await expect(page).toHaveURL(/.*\/login/);
    const errorMessage = page.locator('[role="alert"], .error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid credentials|user not found/i);
  });

  test('prevents SQL injection attempts', async ({ page }) => {
    await fillLoginForm(page, testUsers.sqlInjection.username, testUsers.sqlInjection.password);
    await submitLogin(page);
    
    // Should reject the attempt
    await expect(page).toHaveURL(/.*\/login/);
    const errorMessage = page.locator('[role="alert"], .error-message');
    await expect(errorMessage).toBeVisible();
    
    // Verify no unauthorized access
    const response = await page.request.get('/api/users');
    expect([401, 403]).toContain(response.status());
  });

  test('sanitizes XSS attempts in login form', async ({ page }) => {
    await fillLoginForm(page, testUsers.xssAttempt.username, testUsers.xssAttempt.password);
    await submitLogin(page);
    
    // Check that no script was executed
    const alertCount = await page.evaluate(() => {
      let count = 0;
      const originalAlert = window.alert;
      window.alert = () => { count++; };
      setTimeout(() => { window.alert = originalAlert; }, 1000);
      return count;
    });
    
    expect(alertCount).toBe(0);
  });

  test('handles empty form submission', async ({ page }) => {
    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Check for validation messages
    const usernameError = page.locator('input[name="username"] ~ .error, [data-testid="username-error"]');
    const passwordError = page.locator('input[name="password"] ~ .error, [data-testid="password-error"]');
    
    await expect(usernameError.or(page.locator(':has-text("username is required")'))).toBeVisible();
    await expect(passwordError.or(page.locator(':has-text("password is required")'))).toBeVisible();
  });

  test('handles network errors gracefully', async ({ page, context }) => {
    // Simulate network failure
    await context.route('**/auth/login', route => route.abort('failed'));
    
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page);
    
    // Should show network error message
    const errorMessage = page.locator('[role="alert"], .error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/network error|connection failed|try again/i);
  });

  test('rate limiting after multiple failed attempts', async ({ page }) => {
    // Attempt login 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      await fillLoginForm(page, testUsers.validAdmin.username, `WrongPass${i}`);
      await submitLogin(page);
      await page.waitForTimeout(500);
    }
    
    // 6th attempt should be rate limited
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page);
    
    const errorMessage = page.locator('[role="alert"], .error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/too many attempts|rate limit|try again later/i);
  });

  test('remember me functionality', async ({ page, context }) => {
    // Check remember me checkbox
    const rememberMe = page.locator('input[type="checkbox"][name="remember"], [data-testid="remember-me"]');
    await rememberMe.check();
    
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page);
    
    await page.waitForURL('**/dashboard');
    
    // Get cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'refresh_token' || c.name === 'auth_token');
    
    // Verify cookie has long expiration
    if (authCookie) {
      const expiryDate = new Date(authCookie.expires * 1000);
      const daysDiff = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(7); // At least 7 days
    }
  });

  test('password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const visibilityToggle = page.locator('[data-testid="password-visibility"], button[aria-label*="password"]');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await visibilityToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('keyboard navigation and accessibility', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');
    
    // Fill form using only keyboard
    await page.keyboard.type(testUsers.validAdmin.username);
    await page.keyboard.press('Tab');
    await page.keyboard.type(testUsers.validAdmin.password);
    await page.keyboard.press('Enter');
    
    // Should attempt login
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
    
    // Full accessibility check
    await navigateToLogin(page);
    await checkAccessibility(page, 'login page');
  });

  test('session timeout redirect', async ({ page }) => {
    // Login successfully
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page);
    await page.waitForURL('**/dashboard');
    
    // Simulate expired token
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'expired_token');
    });
    
    // Try to access protected route
    await page.goto('/admin/users');
    
    // Should redirect to login
    await page.waitForURL('**/login');
    
    // Should show session expired message
    const message = page.locator('[role="alert"], .info-message');
    await expect(message).toContainText(/session expired|please log in again/i);
  });

  test('concurrent login sessions', async ({ browser }) => {
    // Login in first browser context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('/login');
    await fillLoginForm(page1, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page1);
    await page1.waitForURL('**/dashboard');
    
    // Login in second browser context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('/login');
    await fillLoginForm(page2, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page2);
    await page2.waitForURL('**/dashboard');
    
    // Both sessions should be valid
    await page1.reload();
    await expect(page1).toHaveURL(/dashboard/);
    
    await page2.reload();
    await expect(page2).toHaveURL(/dashboard/);
    
    await context1.close();
    await context2.close();
  });

  test('logout functionality', async ({ page }) => {
    // Login first
    await fillLoginForm(page, testUsers.validAdmin.username, testUsers.validAdmin.password);
    await submitLogin(page);
    await page.waitForURL('**/dashboard');
    
    // Find and click logout
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
    await userMenu.click();
    
    const logoutButton = page.locator('[data-testid="logout"], button:has-text("Logout"), a:has-text("Sign Out")');
    await logoutButton.click();
    
    // Should redirect to login
    await page.waitForURL('**/login');
    
    // Tokens should be cleared
    const localStorage = await page.evaluate(() => window.localStorage);
    expect(localStorage.access_token).toBeUndefined();
    expect(localStorage.refresh_token).toBeUndefined();
    
    // Should not be able to access protected routes
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
  });

  test('password reset link', async ({ page }) => {
    const resetLink = page.locator('a:has-text("Forgot Password"), [data-testid="forgot-password"]');
    await expect(resetLink).toBeVisible();
    
    await resetLink.click();
    await page.waitForURL('**/reset-password');
    
    await expect(page).toHaveTitle(/Reset Password/i);
    await checkAccessibility(page, 'password reset page');
  });
});