/**
 * Vitest setup file
 * Runs before all tests to configure the test environment
 */

// Mock H3 createError for unit tests
import { vi } from 'vitest'

// Mock createError globally (used by RBAC and auth utilities)
vi.stubGlobal('createError', (options: { statusCode: number; message: string; data?: any }) => {
  const error = new Error(options.message) as Error & { statusCode: number; data?: any }
  error.statusCode = options.statusCode
  error.data = options.data
  return error
})
