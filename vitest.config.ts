import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test file patterns (exclude e2e - those use Playwright)
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**'],

    // Environment for tests
    environment: 'node',

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage',
      include: [
        'server/**/*.ts',
        'app/**/*.ts',
        'app/**/*.vue'
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        'server/db/migrations/**',
        'server/db/seed.ts',
        '**/*.config.ts'
      ],
      // Thresholds - start low, increase as tests are added
      thresholds: {
        // Global thresholds (currently low, increase as coverage improves)
        statements: 2,
        branches: 20,
        functions: 15,
        lines: 2,
        // Per-file thresholds for fully-testable critical paths
        'server/utils/rbac.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90
        },
        'server/db/schema.ts': {
          statements: 90,
          branches: 90,
          functions: 0, // Schema has few callable functions
          lines: 90
        }
      }
    },

    // Timeout for tests
    testTimeout: 10000,

    // Setup files to run before tests
    setupFiles: ['./tests/setup.ts']
  },

  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './')
    }
  }
})
