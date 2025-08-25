import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests to clean up the testing environment
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Keystone Platform E2E Test Teardown');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Calculate test execution time
    const startTime = process.env.TEST_START_TIME;
    const endTime = new Date().toISOString();
    const duration = startTime ? 
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000 : 
      0;
    
    console.log(`⏱️  Test execution completed in ${duration.toFixed(2)} seconds`);
    
    // Clean up test data (if any was created)
    console.log('🗑️  Cleaning up test data...');
    
    try {
      // If tests created any persistent test data, clean it up here
      // This might include clearing test cache, removing test files, etc.
      
      // Clear Address Validator cache if tests used it
      const token = process.env.TEST_AUTH_TOKEN;
      if (token) {
        const cacheResponse = await page.request.delete('https://pw.kevinalthaus.com/api/plugins/address-validator/cache', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (cacheResponse.ok()) {
          console.log('✅ Address validator cache cleared');
        }
      }
      
    } catch (error) {
      console.log('⚠️  Some test data cleanup may have failed:', error.message);
    }
    
    // Generate test summary report
    console.log('📊 Generating test summary...');
    
    try {
      const testResults = {
        executionTime: duration,
        timestamp: endTime,
        environment: 'pw.kevinalthaus.com',
        setupWarnings: process.env.TEST_SETUP_WARNINGS || null,
        cleanupStatus: 'completed'
      };
      
      // Save test summary
      const summaryPath = path.join(process.cwd(), 'test-results', 'test-summary.json');
      await fs.mkdir(path.dirname(summaryPath), { recursive: true });
      await fs.writeFile(summaryPath, JSON.stringify(testResults, null, 2));
      
      console.log('✅ Test summary saved to test-results/test-summary.json');
      
    } catch (error) {
      console.log('⚠️  Could not save test summary:', error.message);
    }
    
    // Check for any failed tests and log summary
    const warningsCount = process.env.TEST_SETUP_WARNINGS ? 1 : 0;
    
    if (warningsCount > 0) {
      console.log(`⚠️  Teardown completed with ${warningsCount} warnings`);
    } else {
      console.log('✅ Teardown completed successfully');
    }
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
    console.error('   Some cleanup operations may not have completed');
  } finally {
    await browser.close();
  }
  
  console.log('🏁 E2E test teardown finished');
}

export default globalTeardown;