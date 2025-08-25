import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests to prepare the testing environment
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Keystone Platform E2E Test Setup');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if the testing environment is available
    console.log('📡 Checking testing environment availability...');
    
    const response = await page.goto('https://pw.kevinalthaus.com/health', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response || !response.ok()) {
      throw new Error(`Testing environment not available. Status: ${response?.status() || 'No response'}`);
    }
    
    const healthData = await response.json().catch(() => ({}));
    console.log('✅ Testing environment is healthy:', healthData);
    
    // Create or verify test user account
    console.log('👤 Setting up test user account...');
    
    try {
      // Attempt to login with test credentials
      await page.goto('https://pw.kevinalthaus.com/login');
      await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
      
      await page.fill('[data-testid="email-input"]', 'test@kevinalthaus.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-button"]');
      
      // Check if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/welcome')) {
        console.log('✅ Test user authenticated successfully');
      } else {
        console.log('⚠️  Test user may need to be created manually');
      }
      
    } catch (error) {
      console.log('⚠️  Could not verify test user authentication:', error.message);
      console.log('   Test user should be created manually or tests may fail');
    }
    
    // Verify Address Validator plugin is available
    console.log('🔍 Checking Address Validator plugin availability...');
    
    try {
      const pluginResponse = await page.goto('https://pw.kevinalthaus.com/api/plugins/address-validator/health', {
        timeout: 15000
      });
      
      if (pluginResponse && pluginResponse.ok()) {
        const pluginHealth = await pluginResponse.json().catch(() => ({}));
        console.log('✅ Address Validator plugin is available:', pluginHealth.status || 'unknown');
      } else {
        console.log('⚠️  Address Validator plugin health check failed');
      }
    } catch (error) {
      console.log('⚠️  Could not verify Address Validator plugin:', error.message);
    }
    
    // Setup test data if needed
    console.log('📝 Setting up test data...');
    
    // Store any global test data in environment variables or files
    process.env.TEST_SETUP_COMPLETE = 'true';
    process.env.TEST_START_TIME = new Date().toISOString();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    console.error('   Tests may fail or be unreliable');
    
    // Don't fail the entire test suite if setup has issues
    // Just log warnings and continue
    process.env.TEST_SETUP_WARNINGS = error.message;
  } finally {
    await browser.close();
  }
}

export default globalSetup;