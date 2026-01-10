import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for documentation screenshot capture
 *
 * Run with: npx playwright test --config=playwright.screenshots.config.ts
 */
export default defineConfig({
  testDir: './tests/screenshots',

  // Run tests serially for consistent screenshots
  fullyParallel: false,

  // No retries needed for screenshots
  retries: 0,

  // Single worker for predictable order
  workers: 1,

  // Simple reporter
  reporter: 'list',

  // Shared settings
  use: {
    baseURL: 'http://localhost:3000',

    // Consistent viewport for screenshots
    viewport: { width: 1280, height: 720 },

    // No traces needed
    trace: 'off',

    // We handle screenshots ourselves
    screenshot: 'off',
    video: 'off'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Expect dev server to be running
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
})
