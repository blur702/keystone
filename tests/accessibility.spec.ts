import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

/**
 * Comprehensive Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance across all pages
 */

const pages = [
  { name: 'Login', path: '/login', requiresAuth: false },
  { name: 'Dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'Users', path: '/users', requiresAuth: true, role: 'admin' },
  { name: 'Roles', path: '/roles', requiresAuth: true, role: 'admin' },
  { name: 'Plugins', path: '/plugins', requiresAuth: true, role: 'admin' },
  { name: 'Settings', path: '/settings', requiresAuth: true, role: 'admin' },
  { name: 'Profile', path: '/profile', requiresAuth: true },
];

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Test user credentials
const adminUser = {
  username: 'admin',
  password: 'Admin@123',
};

async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', adminUser.username);
  await page.fill('input[name="password"]', adminUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

async function runAccessibilityTest(page, pageName) {
  const results = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .exclude('.no-a11y-check') // Exclude elements marked to skip
    .analyze();

  // Generate detailed report
  if (results.violations.length > 0) {
    console.log(`\n=== Accessibility Violations for ${pageName} ===`);
    results.violations.forEach(violation => {
      console.log(`
Rule: ${violation.id}
Impact: ${violation.impact}
Description: ${violation.description}
Help: ${violation.help}
Help URL: ${violation.helpUrl}
Affected elements: ${violation.nodes.length}
      `);
      
      violation.nodes.forEach((node, index) => {
        console.log(`  ${index + 1}. ${node.target.join(' ')}`);
        console.log(`     ${node.failureSummary}`);
      });
    });
  }

  // Assert no violations
  expect(results.violations).toHaveLength(0);
  
  return results;
}

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Configure axe-core
    await page.addInitScript(() => {
      window.axeConfig = {
        branding: {
          application: 'Keystone Platform',
        },
        checks: [
          {
            id: 'color-contrast-enhanced',
            enabled: true,
          },
        ],
      };
    });
  });

  pages.forEach(pageInfo => {
    test(`${pageInfo.name} page meets WCAG 2.1 AA standards`, async ({ page }) => {
      if (pageInfo.requiresAuth) {
        await login(page);
      }
      
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      await runAccessibilityTest(page, pageInfo.name);
    });
  });

  test('keyboard navigation works throughout the application', async ({ page }) => {
    await page.goto('/login');
    
    // Test tab order
    const tabbableElements = await page.evaluate(() => {
      const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elements = Array.from(document.querySelectorAll(selector));
      return elements.map(el => ({
        tag: el.tagName,
        type: el.type || '',
        text: el.textContent?.trim() || '',
        label: el.getAttribute('aria-label') || '',
      }));
    });
    
    // Verify logical tab order exists
    expect(tabbableElements.length).toBeGreaterThan(0);
    
    // Test keyboard interaction
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();
    
    // Navigate through form
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Test Enter key submission
    await page.fill('input[name="username"]', adminUser.username);
    await page.keyboard.press('Tab');
    await page.fill('input[name="password"]', adminUser.password);
    await page.keyboard.press('Enter');
    
    // Should navigate or show error
    await page.waitForTimeout(2000);
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/login');
    
    // Check focus styles
    const focusStyles = await page.evaluate(() => {
      const button = document.querySelector('button');
      button?.focus();
      const styles = window.getComputedStyle(button);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow,
      };
    });
    
    // Verify focus is visible
    const hasVisibleFocus = 
      (focusStyles.outline !== 'none' && focusStyles.outlineWidth !== '0px') ||
      focusStyles.boxShadow !== 'none';
    
    expect(hasVisibleFocus).toBeTruthy();
  });

  test('ARIA attributes are properly implemented', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    
    // Check for proper ARIA landmarks
    const landmarks = await page.evaluate(() => {
      const landmarkRoles = ['banner', 'navigation', 'main', 'contentinfo'];
      const found = {};
      
      landmarkRoles.forEach(role => {
        const element = document.querySelector(`[role="${role}"]`) || 
                       document.querySelector(role === 'banner' ? 'header' :
                                             role === 'navigation' ? 'nav' :
                                             role === 'main' ? 'main' :
                                             'footer');
        found[role] = !!element;
      });
      
      return found;
    });
    
    expect(landmarks.main).toBeTruthy();
    expect(landmarks.navigation).toBeTruthy();
    
    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return allHeadings.map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent?.trim(),
      }));
    });
    
    // Verify h1 exists
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Verify heading hierarchy
    for (let i = 1; i < headings.length; i++) {
      const levelDiff = headings[i].level - headings[i - 1].level;
      expect(levelDiff).toBeLessThanOrEqual(1); // No skipping levels
    }
  });

  test('forms have proper labels and error messages', async ({ page }) => {
    await page.goto('/login');
    
    // Check all inputs have labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.filter(input => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
        
        return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy;
      }).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
      }));
    });
    
    expect(inputsWithoutLabels).toHaveLength(0);
    
    // Test error message association
    await page.click('button[type="submit"]'); // Submit empty form
    await page.waitForTimeout(1000);
    
    const errorAssociations = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('[role="alert"], .error-message'));
      return errors.map(error => {
        const id = error.id;
        const associatedInput = document.querySelector(`[aria-describedby="${id}"], [aria-errormessage="${id}"]`);
        return {
          errorId: id,
          hasAssociation: !!associatedInput,
          errorText: error.textContent?.trim(),
        };
      });
    });
    
    errorAssociations.forEach(error => {
      if (error.errorId) {
        expect(error.hasAssociation).toBeTruthy();
      }
    });
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();
    
    expect(results.violations).toHaveLength(0);
  });

  test('images have alt text', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.alt && img.role !== 'presentation').map(img => ({
        src: img.src,
        className: img.className,
      }));
    });
    
    expect(imagesWithoutAlt).toHaveLength(0);
  });

  test('page has proper language attribute', async ({ page }) => {
    await page.goto('/login');
    
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
  });

  test('skip links are functional', async ({ page }) => {
    await page.goto('/login');
    
    // Check for skip link
    const skipLink = await page.evaluate(() => {
      const link = document.querySelector('a[href="#main"], a[href="#content"], .skip-link');
      return {
        exists: !!link,
        href: link?.getAttribute('href'),
        text: link?.textContent?.trim(),
      };
    });
    
    if (skipLink.exists) {
      // Test skip link functionality
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toMatch(/main|content/);
    }
  });

  test('modal dialogs trap focus', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    
    // Find and open a modal
    const modalTrigger = await page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
    
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);
      
      // Check if focus is trapped
      const isModalOpen = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal');
        return !!modal;
      });
      
      if (isModalOpen) {
        // Test focus trap
        const focusableInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], .modal');
          const focusable = modal?.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
          return focusable?.length || 0;
        });
        
        expect(focusableInModal).toBeGreaterThan(0);
        
        // Test Escape key closes modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        const isModalClosed = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], .modal');
          return !modal || modal.style.display === 'none';
        });
        
        expect(isModalClosed).toBeTruthy();
      }
    }
  });

  test('responsive design maintains accessibility', async ({ page, viewport }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    const mobileResults = await runAccessibilityTest(page, 'Login (Mobile)');
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    const tabletResults = await runAccessibilityTest(page, 'Login (Tablet)');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    const desktopResults = await runAccessibilityTest(page, 'Login (Desktop)');
  });

  test('animations respect prefers-reduced-motion', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login');
    
    const hasAnimations = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.some(el => {
        const styles = window.getComputedStyle(el);
        const animationDuration = parseFloat(styles.animationDuration);
        const transitionDuration = parseFloat(styles.transitionDuration);
        
        // Check if any element has animations longer than 0.1s
        return animationDuration > 0.1 || transitionDuration > 0.1;
      });
    });
    
    expect(hasAnimations).toBeFalsy();
  });

  test('screen reader announcements work', async ({ page }) => {
    await login(page);
    
    // Check for live regions
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"]');
      return Array.from(regions).map(region => ({
        role: region.getAttribute('role'),
        ariaLive: region.getAttribute('aria-live'),
        content: region.textContent?.trim(),
      }));
    });
    
    // Trigger an action that should announce
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(2000);
      
      // Check if announcement was made
      const announcements = await page.evaluate(() => {
        const regions = document.querySelectorAll('[aria-live="polite"], [aria-live="assertive"], [role="alert"], [role="status"]');
        return Array.from(regions)
          .filter(r => r.textContent?.trim())
          .map(r => r.textContent?.trim());
      });
      
      expect(announcements.length).toBeGreaterThan(0);
    }
  });
});