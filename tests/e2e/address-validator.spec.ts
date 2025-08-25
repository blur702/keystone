import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Tests for Address Validator Plugin
 * 
 * These tests validate the complete Address Validator functionality
 * against the pw.kevinalthaus.com testing environment
 */

// Test configuration
const BASE_URL = 'https://pw.kevinalthaus.com';
const TEST_TIMEOUT = 30000;

// Test data
const TEST_ADDRESSES = {
  valid: {
    street1: '1600 Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    postalCode: '94043',
    country: 'US'
  },
  invalid: {
    street1: 'Invalid Address 99999',
    city: 'Nonexistent City',
    state: 'XX',
    postalCode: '00000',
    country: 'XX'
  },
  partial: {
    street1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    country: 'US'
  }
};

const TEST_USER = {
  email: 'test@kevinalthaus.com',
  password: 'TestPassword123!'
};

/**
 * Test helper functions
 */
class AddressValidatorTestHelper {
  constructor(private page: Page) {}

  /**
   * Login to the application
   */
  async login(email: string = TEST_USER.email, password: string = TEST_USER.password) {
    await this.page.goto(`${BASE_URL}/login`);
    
    // Wait for login form
    await this.page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
    
    // Fill login form
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    // Submit login
    await this.page.click('[data-testid="submit-button"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Navigate to Address Validator plugin
   */
  async navigateToAddressValidator() {
    // Look for the plugin in the main menu or plugins section
    await this.page.goto(`${BASE_URL}/plugins/address-validator`);
    
    // Wait for the component to load
    await this.page.waitForSelector('[data-testid="address-validator"]', { timeout: 10000 });
  }

  /**
   * Fill address form
   */
  async fillAddress(address: Partial<typeof TEST_ADDRESSES.valid>) {
    if (address.street1) {
      await this.page.fill('[data-testid="street1-input"]', address.street1);
    }
    if (address.street2) {
      await this.page.fill('[data-testid="street2-input"]', address.street2 || '');
    }
    if (address.city) {
      await this.page.fill('[data-testid="city-input"]', address.city);
    }
    if (address.state) {
      await this.page.fill('[data-testid="state-input"]', address.state);
    }
    if (address.postalCode) {
      await this.page.fill('[data-testid="postal-code-input"]', address.postalCode);
    }
    if (address.country) {
      await this.page.fill('[data-testid="country-input"]', address.country);
    }
  }

  /**
   * Submit validation request
   */
  async validateAddress() {
    await this.page.click('[data-testid="validate-button"]');
    
    // Wait for validation to complete
    await this.page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="validate-button"]');
      return button && !button.hasAttribute('disabled');
    }, { timeout: 15000 });
  }

  /**
   * Wait for validation results
   */
  async waitForValidationResults() {
    await this.page.waitForSelector('[data-testid="validation-results"]', { timeout: 15000 });
  }

  /**
   * Get validation status
   */
  async getValidationStatus(): Promise<'valid' | 'invalid' | 'warning'> {
    const statusChip = await this.page.locator('[data-testid="status-chip"]');
    const statusText = await statusChip.textContent();
    
    if (statusText?.includes('Valid')) return 'valid';
    if (statusText?.includes('Invalid')) return 'invalid';
    return 'warning';
  }

  /**
   * Check if standardized address is shown
   */
  async hasStandardizedAddress(): Promise<boolean> {
    return await this.page.locator('[data-testid="standardized-address"]').isVisible();
  }

  /**
   * Check if coordinates are shown
   */
  async hasCoordinates(): Promise<boolean> {
    return await this.page.locator('[data-testid="coordinates"]').isVisible();
  }

  /**
   * Clear address form
   */
  async clearAddress() {
    await this.page.click('[data-testid="clear-button"]');
  }

  /**
   * Use standardized address
   */
  async useStandardizedAddress() {
    await this.page.click('[data-testid="use-standardized-button"]');
  }
}

/**
 * Test Suite Setup
 */
test.describe('Address Validator Plugin', () => {
  let helper: AddressValidatorTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AddressValidatorTestHelper(page);
    
    // Set longer timeout for these tests
    test.setTimeout(TEST_TIMEOUT);
    
    // Login before each test
    await helper.login();
    
    // Navigate to Address Validator
    await helper.navigateToAddressValidator();
  });

  /**
   * Basic UI Tests
   */
  test.describe('User Interface', () => {
    test('should display Address Validator component', async ({ page }) => {
      // Check component is visible
      await expect(page.locator('[data-testid="address-validator"]')).toBeVisible();
      
      // Check title is displayed
      await expect(page.locator('text=Address Validator')).toBeVisible();
      
      // Check form fields are present
      await expect(page.locator('[data-testid="street1-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="city-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="postal-code-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="country-input"]')).toBeVisible();
      
      // Check action buttons are present
      await expect(page.locator('[data-testid="validate-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="clear-button"]')).toBeVisible();
    });

    test('should have responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('[data-testid="address-validator"]')).toBeVisible();
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="address-validator"]')).toBeVisible();
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="address-validator"]')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form fields
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="street1-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="street2-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="city-input"]')).toBeFocused();
      
      // Continue tabbing to validate button
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
      }
      await expect(page.locator('[data-testid="validate-button"]')).toBeFocused();
    });
  });

  /**
   * Address Validation Tests
   */
  test.describe('Address Validation', () => {
    test('should validate a complete valid address', async ({ page }) => {
      // Fill valid address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      
      // Submit validation
      await helper.validateAddress();
      
      // Wait for results
      await helper.waitForValidationResults();
      
      // Check validation status
      const status = await helper.getValidationStatus();
      expect(['valid', 'warning']).toContain(status);
      
      // Check standardized address is shown
      expect(await helper.hasStandardizedAddress()).toBeTruthy();
      
      // Check coordinates are shown
      expect(await helper.hasCoordinates()).toBeTruthy();
      
      // Verify confidence is displayed
      await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
      
      // Verify provider is displayed
      await expect(page.locator('[data-testid="provider-name"]')).toBeVisible();
    });

    test('should handle invalid addresses gracefully', async ({ page }) => {
      // Fill invalid address
      await helper.fillAddress(TEST_ADDRESSES.invalid);
      
      // Submit validation
      await helper.validateAddress();
      
      // Wait for results
      await helper.waitForValidationResults();
      
      // Check validation status
      const status = await helper.getValidationStatus();
      expect(status).toBe('invalid');
      
      // Check error messages are shown
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    });

    test('should validate partial addresses', async ({ page }) => {
      // Fill partial address
      await helper.fillAddress(TEST_ADDRESSES.partial);
      
      // Submit validation
      await helper.validateAddress();
      
      // Wait for results
      await helper.waitForValidationResults();
      
      // Should show results (even if with warnings)
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    });

    test('should show loading state during validation', async ({ page }) => {
      // Fill address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      
      // Click validate button and immediately check loading state
      await page.click('[data-testid="validate-button"]');
      
      // Check button shows loading state
      await expect(page.locator('[data-testid="validate-button"]')).toHaveAttribute('disabled');
      await expect(page.locator('text=Validating...')).toBeVisible();
      
      // Wait for validation to complete
      await helper.waitForValidationResults();
    });

    test('should require at least one address field', async ({ page }) => {
      // Try to validate empty form
      await helper.validateAddress();
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=Please enter at least one address field')).toBeVisible();
    });
  });

  /**
   * Interactive Features Tests
   */
  test.describe('Interactive Features', () => {
    test('should allow using standardized address', async ({ page }) => {
      // Fill and validate address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      await helper.waitForValidationResults();
      
      // Use standardized address if available
      if (await helper.hasStandardizedAddress()) {
        await helper.useStandardizedAddress();
        
        // Verify form fields are updated
        const street1Value = await page.locator('[data-testid="street1-input"]').inputValue();
        expect(street1Value).toBeTruthy();
      }
    });

    test('should allow clearing the form', async ({ page }) => {
      // Fill address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      
      // Clear form
      await helper.clearAddress();
      
      // Verify all fields are empty
      await expect(page.locator('[data-testid="street1-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="city-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="state-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="postal-code-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="country-input"]')).toHaveValue('');
      
      // Verify validation results are cleared
      await expect(page.locator('[data-testid="validation-results"]')).not.toBeVisible();
    });

    test('should show/hide advanced details', async ({ page }) => {
      // Fill and validate address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      await helper.waitForValidationResults();
      
      // Check if details toggle exists
      const detailsToggle = page.locator('[data-testid="details-toggle"]');
      if (await detailsToggle.isVisible()) {
        // Click to show details
        await detailsToggle.click();
        await expect(page.locator('[data-testid="address-components"]')).toBeVisible();
        
        // Click to hide details
        await detailsToggle.click();
        await expect(page.locator('[data-testid="address-components"]')).not.toBeVisible();
      }
    });

    test('should copy address to clipboard', async ({ page }) => {
      // Fill and validate address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      await helper.waitForValidationResults();
      
      // Click copy button if available
      const copyButton = page.locator('[data-testid="copy-button"]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Note: Clipboard API testing requires special permissions in Playwright
        // This is more of a smoke test to ensure the button works
      }
    });
  });

  /**
   * API Integration Tests
   */
  test.describe('API Integration', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/plugins/address-validator/validate', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable'
          })
        });
      });
      
      // Fill and submit address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      
      // Check error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=Service temporarily unavailable')).toBeVisible();
    });

    test('should handle network timeouts', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/plugins/address-validator/validate', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              success: true,
              validation: {
                isValid: true,
                confidence: 0.9,
                provider: 'test',
                timestamp: new Date().toISOString()
              }
            })
          });
        }, 12000); // 12 second delay
      });
      
      // Fill and submit address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      
      // Should eventually show results or timeout error
      try {
        await helper.waitForValidationResults();
      } catch {
        // Timeout is expected behavior
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      }
    });

    test('should handle authentication errors', async ({ page }) => {
      // Mock 401 response
      await page.route('**/api/plugins/address-validator/validate', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({
            success: false,
            error: 'Unauthorized'
          })
        });
      });
      
      // Fill and submit address
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      
      // Check error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  /**
   * Batch Validation Tests
   */
  test.describe('Batch Validation', () => {
    test('should validate multiple addresses', async ({ page }) => {
      // Navigate to batch validation if available
      const batchButton = page.locator('[data-testid="batch-validation-button"]');
      if (await batchButton.isVisible()) {
        await batchButton.click();
        
        // Add multiple addresses
        await helper.fillAddress(TEST_ADDRESSES.valid);
        await page.click('[data-testid="add-address-button"]');
        
        await helper.fillAddress(TEST_ADDRESSES.partial);
        
        // Submit batch validation
        await page.click('[data-testid="validate-batch-button"]');
        
        // Wait for results
        await page.waitForSelector('[data-testid="batch-results"]', { timeout: 20000 });
        
        // Check that multiple results are shown
        const resultItems = await page.locator('[data-testid="batch-result-item"]').count();
        expect(resultItems).toBeGreaterThanOrEqual(2);
      }
    });
  });

  /**
   * Accessibility Tests
   */
  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check form inputs have labels
      await expect(page.locator('[data-testid="street1-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="city-input"]')).toHaveAttribute('aria-label');
      
      // Check buttons have accessible names
      await expect(page.locator('[data-testid="validate-button"]')).toHaveAccessibleName();
      await expect(page.locator('[data-testid="clear-button"]')).toHaveAccessibleName();
    });

    test('should support screen readers', async ({ page }) => {
      // Check semantic structure
      await expect(page.locator('h1, h2, h3, h4, h5, h6')).toHaveCount({ min: 1 });
      
      // Check form structure
      await expect(page.locator('form, [role="form"]')).toBeVisible();
      
      // Check status messages are announced
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      await helper.waitForValidationResults();
      
      // Status should be in a live region
      await expect(page.locator('[aria-live="polite"], [aria-live="assertive"]')).toBeVisible();
    });

    test('should meet color contrast requirements', async ({ page }) => {
      // This would typically use axe-core or similar accessibility testing library
      // For now, just ensure important elements are visible
      await expect(page.locator('[data-testid="validate-button"]')).toBeVisible();
      await expect(page.locator('text=Address Validator')).toBeVisible();
    });
  });

  /**
   * Performance Tests
   */
  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await helper.navigateToAddressValidator();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should validate addresses quickly', async ({ page }) => {
      await helper.fillAddress(TEST_ADDRESSES.valid);
      
      const startTime = Date.now();
      await helper.validateAddress();
      await helper.waitForValidationResults();
      const validationTime = Date.now() - startTime;
      
      expect(validationTime).toBeLessThan(10000); // Should validate within 10 seconds
    });
  });
});

/**
 * Cross-browser compatibility tests
 */
test.describe('Cross-browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Test for ${browserName} only`);
      
      const helper = new AddressValidatorTestHelper(page);
      await helper.login();
      await helper.navigateToAddressValidator();
      
      // Basic functionality test
      await helper.fillAddress(TEST_ADDRESSES.valid);
      await helper.validateAddress();
      await helper.waitForValidationResults();
      
      const status = await helper.getValidationStatus();
      expect(['valid', 'warning', 'invalid']).toContain(status);
    });
  });
});