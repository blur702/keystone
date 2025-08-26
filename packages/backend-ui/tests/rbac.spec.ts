import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * Comprehensive RBAC (Role-Based Access Control) Test Suite
 * Tests all permission scenarios with different user roles
 */

// Test users with different roles and permissions
const testUsers = {
  superAdmin: {
    email: 'alexandra.martinez@keystone.com',
    username: 'amartinez',
    password: 'SuperAdmin#2024!',
    role: 'super_admin',
    permissions: ['*:*'], // All permissions
  },
  admin: {
    email: 'david.thompson@keystone.com',
    username: 'dthompson',
    password: 'Admin$ecure123',
    role: 'admin',
    permissions: [
      'users:manage',
      'roles:manage',
      'plugins:manage',
      'settings:manage',
      'analytics:view',
    ],
  },
  pluginManager: {
    email: 'jennifer.wong@keystone.com',
    username: 'jwong',
    password: 'Plugin@Manager99',
    role: 'plugin_manager',
    permissions: [
      'plugins:manage',
      'plugins:install',
      'plugins:configure',
      'analytics:view',
    ],
  },
  contentEditor: {
    email: 'robert.garcia@keystone.com',
    username: 'rgarcia',
    password: 'Editor#Pass2024',
    role: 'editor',
    permissions: [
      'content:create',
      'content:edit',
      'content:delete',
      'media:upload',
    ],
  },
  viewer: {
    email: 'emily.chen@keystone.com',
    username: 'echen',
    password: 'Viewer$Only123',
    role: 'viewer',
    permissions: [
      'dashboard:view',
      'analytics:view',
      'content:view',
    ],
  },
  restrictedUser: {
    email: 'guest.user@external.com',
    username: 'guestuser',
    password: 'Guest@Access01',
    role: 'restricted',
    permissions: ['dashboard:view'], // Minimal permissions
  },
};

// Helper functions
async function login(page: Page, user: typeof testUsers.admin) {
  await page.goto('/login');
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function logout(page: Page) {
  const userMenu = page.locator('[data-testid="user-menu"], .user-menu');
  await userMenu.click();
  await page.click('text=Logout');
  await page.waitForURL('**/login');
}

async function checkAccessibility(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toHaveLength(0);
}

async function verifyPermissionDenied(page: Page, attemptedAction: string) {
  // Check for permission denied indicators
  const permissionDenied = page.locator(
    '[role="alert"]:has-text("permission denied"), ' +
    '[role="alert"]:has-text("unauthorized"), ' +
    '[role="alert"]:has-text("access denied"), ' +
    '.error-403, .forbidden-message'
  );
  
  const pageNotFound = page.locator('text=/404|not found/i');
  
  // Either permission denied or 404 is acceptable
  await expect(permissionDenied.or(pageNotFound)).toBeVisible({ timeout: 5000 });
}

test.describe('RBAC - Plugin Management Access', () => {
  test('admin user can access and manage plugins', async ({ page }) => {
    // Login as admin
    await login(page, testUsers.admin);
    
    // Navigate to plugins page
    await page.click('[data-testid="nav-plugins"], a:has-text("Plugins")');
    await page.waitForURL('**/plugins');
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Plugins/i);
    await expect(page.locator('h1, [role="heading"]')).toContainText(/Plugin.*Management/i);
    
    // Verify admin can see plugin management controls
    const installButton = page.locator('button:has-text("Install Plugin"), [data-testid="install-plugin"]');
    await expect(installButton).toBeVisible();
    await expect(installButton).toBeEnabled();
    
    // Check for plugin list
    const pluginList = page.locator('[data-testid="plugin-list"], .plugin-grid, table.plugins');
    await expect(pluginList).toBeVisible();
    
    // Verify admin can access plugin settings
    const firstPlugin = page.locator('[data-testid="plugin-item"], .plugin-card').first();
    if (await firstPlugin.count() > 0) {
      const settingsButton = firstPlugin.locator('button:has-text("Settings"), [data-testid="plugin-settings"]');
      await expect(settingsButton).toBeEnabled();
      
      await settingsButton.click();
      await expect(page.locator('.plugin-settings, [role="dialog"]')).toBeVisible();
    }
    
    // Check accessibility
    await checkAccessibility(page, 'plugins page for admin');
  });

  test('regular user cannot access plugin management', async ({ page }) => {
    // Login as viewer (no plugin permissions)
    await login(page, testUsers.viewer);
    
    // Verify plugin management is not in navigation
    const pluginNav = page.locator('[data-testid="nav-plugins"], a:has-text("Plugins")');
    await expect(pluginNav).toBeHidden();
    
    // Try direct URL access
    await page.goto('/plugins');
    
    // Should be denied or redirected
    await verifyPermissionDenied(page, 'plugin access');
    
    // Verify URL is not /plugins
    await expect(page).not.toHaveURL(/.*\/plugins$/);
  });

  test('plugin manager has limited plugin permissions', async ({ page }) => {
    // Login as plugin manager
    await login(page, testUsers.pluginManager);
    
    // Can access plugins
    await page.click('[data-testid="nav-plugins"], a:has-text("Plugins")');
    await page.waitForURL('**/plugins');
    
    // Can install and configure plugins
    const installButton = page.locator('button:has-text("Install Plugin")');
    await expect(installButton).toBeVisible();
    await expect(installButton).toBeEnabled();
    
    // But cannot access user management
    const userNav = page.locator('[data-testid="nav-users"], a:has-text("Users")');
    await expect(userNav).toBeHidden();
    
    // Direct access to users should be denied
    await page.goto('/users');
    await verifyPermissionDenied(page, 'user management');
  });
});

test.describe('RBAC - User Management Permissions', () => {
  test('admin can manage users', async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Navigate to users
    await page.click('[data-testid="nav-users"], a:has-text("Users")');
    await page.waitForURL('**/users');
    
    // Can see user list
    const userTable = page.locator('table.users, [data-testid="user-list"]');
    await expect(userTable).toBeVisible();
    
    // Can add new user
    const addUserButton = page.locator('button:has-text("Add User"), [data-testid="add-user"]');
    await expect(addUserButton).toBeVisible();
    await expect(addUserButton).toBeEnabled();
    
    // Can edit users
    const editButtons = page.locator('button:has-text("Edit"), [data-testid="edit-user"]');
    const editCount = await editButtons.count();
    if (editCount > 0) {
      await expect(editButtons.first()).toBeEnabled();
    }
    
    // Can delete users
    const deleteButtons = page.locator('button:has-text("Delete"), [data-testid="delete-user"]');
    if (await deleteButtons.count() > 0) {
      await expect(deleteButtons.first()).toBeEnabled();
    }
  });

  test('non-admin cannot manage users', async ({ page }) => {
    await login(page, testUsers.contentEditor);
    
    // Users not in navigation
    const userNav = page.locator('[data-testid="nav-users"], a:has-text("Users")');
    await expect(userNav).toBeHidden();
    
    // Direct access denied
    await page.goto('/users');
    await verifyPermissionDenied(page, 'user management');
  });
});

test.describe('RBAC - Role Management', () => {
  test('admin can manage roles', async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Navigate to roles
    await page.click('[data-testid="nav-roles"], a:has-text("Roles")');
    await page.waitForURL('**/roles');
    
    // Can see role list
    await expect(page.locator('h1')).toContainText(/Roles/i);
    
    // Can create new role
    const createRoleButton = page.locator('button:has-text("Create Role"), [data-testid="create-role"]');
    await expect(createRoleButton).toBeVisible();
    await expect(createRoleButton).toBeEnabled();
    
    // Can edit permissions
    const permissionCheckboxes = page.locator('input[type="checkbox"][name*="permission"]');
    if (await permissionCheckboxes.count() > 0) {
      await expect(permissionCheckboxes.first()).toBeEnabled();
    }
  });

  test('plugin manager cannot manage roles', async ({ page }) => {
    await login(page, testUsers.pluginManager);
    
    // Roles not accessible
    const rolesNav = page.locator('[data-testid="nav-roles"], a:has-text("Roles")');
    await expect(rolesNav).toBeHidden();
    
    // Direct access denied
    await page.goto('/roles');
    await verifyPermissionDenied(page, 'role management');
  });
});

test.describe('RBAC - Settings Access', () => {
  test('admin can access all settings', async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Navigate to settings
    await page.click('[data-testid="nav-settings"], a:has-text("Settings")');
    await page.waitForURL('**/settings');
    
    // Can see all settings sections
    const settingsSections = [
      'General Settings',
      'Security Settings',
      'Email Configuration',
      'API Settings',
      'Database Settings',
    ];
    
    for (const section of settingsSections) {
      const sectionElement = page.locator(`text=/${section}/i`);
      await expect(sectionElement).toBeVisible();
    }
    
    // Can modify settings
    const saveButton = page.locator('button:has-text("Save"), [data-testid="save-settings"]');
    await expect(saveButton).toBeEnabled();
  });

  test('viewer cannot access settings', async ({ page }) => {
    await login(page, testUsers.viewer);
    
    // Settings not in navigation
    const settingsNav = page.locator('[data-testid="nav-settings"], a:has-text("Settings")');
    await expect(settingsNav).toBeHidden();
    
    // Direct access denied
    await page.goto('/settings');
    await verifyPermissionDenied(page, 'settings access');
  });
});

test.describe('RBAC - Dashboard Access Levels', () => {
  test('all users can access dashboard with different views', async ({ page }) => {
    // Test each user type
    for (const [userType, user] of Object.entries(testUsers)) {
      await login(page, user);
      
      // All users should reach dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // But see different widgets based on permissions
      if (user.permissions.includes('analytics:view')) {
        await expect(page.locator('[data-testid="analytics-widget"]')).toBeVisible();
      }
      
      if (user.permissions.includes('users:manage')) {
        await expect(page.locator('[data-testid="user-stats-widget"]')).toBeVisible();
      }
      
      if (user.permissions.includes('plugins:manage')) {
        await expect(page.locator('[data-testid="plugin-stats-widget"]')).toBeVisible();
      }
      
      await logout(page);
    }
  });
});

test.describe('RBAC - API Permission Enforcement', () => {
  test('API respects role permissions', async ({ page, request }) => {
    // Login as restricted user
    await login(page, testUsers.restrictedUser);
    
    // Get auth token
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    
    // Try to access protected API endpoints
    const endpoints = [
      { url: '/api/users', expectedStatus: [403, 401] },
      { url: '/api/roles', expectedStatus: [403, 401] },
      { url: '/api/plugins', expectedStatus: [403, 401] },
      { url: '/api/settings', expectedStatus: [403, 401] },
      { url: '/api/dashboard', expectedStatus: [200] }, // Should have access
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      expect(endpoint.expectedStatus).toContain(response.status());
    }
  });
});

test.describe('RBAC - Permission Inheritance', () => {
  test('super admin has all permissions', async ({ page }) => {
    await login(page, testUsers.superAdmin);
    
    // Should see all navigation items
    const navItems = [
      'Dashboard',
      'Users',
      'Roles',
      'Plugins',
      'Settings',
      'Analytics',
    ];
    
    for (const item of navItems) {
      const navElement = page.locator(`nav >> text=/${item}/i`);
      await expect(navElement).toBeVisible();
    }
    
    // Can access any page
    const protectedPages = ['/users', '/roles', '/plugins', '/settings'];
    
    for (const pagePath of protectedPages) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL(/.*\/login/);
      await expect(page).not.toHaveURL(/.*\/403/);
    }
  });
});

test.describe('RBAC - Dynamic Permission Updates', () => {
  test('permission changes take effect immediately', async ({ browser }) => {
    // Create two contexts for admin and regular user
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, testUsers.admin);
    
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await login(userPage, testUsers.contentEditor);
    
    // Initially, content editor cannot access plugins
    await userPage.goto('/plugins');
    await verifyPermissionDenied(userPage, 'initial plugin access');
    
    // Admin grants plugin access to editor role
    await adminPage.goto('/roles');
    await adminPage.click(`tr:has-text("${testUsers.contentEditor.role}")`);
    await adminPage.check('input[value="plugins:view"]');
    await adminPage.click('button:has-text("Save")');
    await adminPage.waitForSelector('text=/saved successfully/i');
    
    // Content editor refreshes and should now have access
    await userPage.reload();
    await userPage.goto('/plugins');
    await expect(userPage).toHaveURL(/.*\/plugins/);
    await expect(userPage.locator('h1')).toContainText(/Plugins/i);
    
    await adminContext.close();
    await userContext.close();
  });
});

test.describe('RBAC - Audit Trail', () => {
  test('permission-denied attempts are logged', async ({ page, request }) => {
    await login(page, testUsers.restrictedUser);
    
    // Attempt to access forbidden resources
    const forbiddenUrls = ['/users', '/roles', '/plugins'];
    
    for (const url of forbiddenUrls) {
      await page.goto(url);
      await page.waitForTimeout(1000);
    }
    
    // Admin checks audit logs
    await logout(page);
    await login(page, testUsers.admin);
    
    await page.goto('/admin/audit-logs');
    
    // Should see failed access attempts
    const auditEntries = page.locator('.audit-entry:has-text("Access Denied")');
    const count = await auditEntries.count();
    expect(count).toBeGreaterThanOrEqual(forbiddenUrls.length);
  });
});

test.describe('RBAC - Edge Cases', () => {
  test('handles missing permissions gracefully', async ({ page }) => {
    // Create a user with null/undefined permissions
    await login(page, testUsers.admin);
    await page.goto('/users/create');
    
    await page.fill('input[name="email"]', 'broken.permissions@test.com');
    await page.fill('input[name="username"]', 'brokenuser');
    await page.fill('input[name="password"]', 'Test@Pass123');
    
    // Don't assign any role
    await page.click('button:has-text("Create User")');
    
    // Login as the broken user
    await logout(page);
    await page.goto('/login');
    await page.fill('input[name="username"]', 'brokenuser');
    await page.fill('input[name="password"]', 'Test@Pass123');
    await page.click('button[type="submit"]');
    
    // Should have minimal access (dashboard only)
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Should not see any admin navigation
    const adminNavItems = page.locator('nav >> text=/Users|Roles|Plugins|Settings/i');
    await expect(adminNavItems).toHaveCount(0);
  });

  test('handles circular role dependencies', async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/roles');
    
    // Try to create circular dependency
    await page.click('button:has-text("Create Role")');
    await page.fill('input[name="roleName"]', 'CircularRole1');
    await page.selectOption('select[name="inheritsFrom"]', 'CircularRole2');
    
    // System should prevent this
    const errorMessage = page.locator('.error:has-text("circular dependency")');
    await expect(errorMessage.or(page.locator('text=/cannot inherit/i'))).toBeVisible();
  });
});

test.describe('RBAC - Performance', () => {
  test('permission checks do not slow down navigation', async ({ page }) => {
    await login(page, testUsers.admin);
    
    const startTime = Date.now();
    
    // Navigate through multiple protected pages
    const pages = ['/dashboard', '/users', '/roles', '/plugins', '/settings'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete in reasonable time (< 10 seconds for 5 pages)
    expect(totalTime).toBeLessThan(10000);
  });
});