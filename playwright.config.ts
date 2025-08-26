import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Keystone Platform Testing
 * 
 * Configured for testing against pw.kevinalthaus.com testing environment
 * with comprehensive browser coverage and reporting
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Shared settings for all tests
  use: {
    // Base URL for tests - staging environment
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://pw.kevinalthaus.com',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Global timeout for actions
    actionTimeout: 15000,
    
    // Global timeout for navigation
    navigationTimeout: 30000,
    
    // Realistic browser settings
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Strict mode for selectors
    strict: true,
    
    // Accept downloads during tests
    acceptDownloads: true,
  },

  // Global test timeout
  timeout: 60000,

  // Global expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects for different browsers and configurations
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        channel: 'chrome',
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      },
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'tablet-chrome',
      use: { ...devices['Galaxy Tab S4'] },
    },

    // High DPI
    {
      name: 'chromium-hidpi',
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 2,
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Different network conditions
    {
      name: 'chromium-slow-network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow network
        contextOptions: {
          // This would be configured with custom network throttling
        }
      },
    },

    // Accessibility testing
    {
      name: 'chromium-accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable additional accessibility features
        launchOptions: {
          args: [
            '--force-prefers-reduced-motion',
            '--enable-accessibility-experiments'
          ]
        }
      },
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  // Web server configuration (for local development)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 5174, // Backend UI port
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },

  // Output directory
  outputDir: 'test-results/',

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.e2e.ts'
  ],

  // Files to ignore
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  // Maximum number of test files to run in parallel
  maxFailures: process.env.CI ? 10 : undefined,

  // Metadata
  metadata: {
    platform: 'keystone-testing',
    environment: 'pw.kevinalthaus.com',
    version: '1.0.0'
  }
});