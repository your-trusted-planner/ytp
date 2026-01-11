import { test, expect } from '@playwright/test'
import {
  PROTECTED_ROUTES,
  FIRM_ROUTES,
  ADMIN_ROUTES,
  CLIENT_ROUTES as CLIENT_ONLY_ROUTES,
  API_ACCESS_CONTROL,
  type RouteConfig
} from '../../shared/routes'

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      // Check for email and password fields (using placeholder or label text)
      await expect(page.getByPlaceholder(/example\.com/i)).toBeVisible()
      await expect(page.getByPlaceholder(/••••/)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/login')

      await page.getByPlaceholder(/example\.com/i).fill('not-an-email')
      await page.getByPlaceholder(/••••/).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error or stay on login page
      await expect(page).toHaveURL(/login/)
    })

    test('should show error for wrong credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByPlaceholder(/example\.com/i).fill('nonexistent@example.com')
      await page.getByPlaceholder(/••••/).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error message
      await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Public Routes', () => {
    test('should allow access to home page', async ({ page }) => {
      const response = await page.goto('/')

      expect(response?.status()).toBeLessThan(400)
    })

    test('should allow access to login page', async ({ page }) => {
      const response = await page.goto('/login')

      expect(response?.status()).toBeLessThan(400)
      await expect(page).toHaveURL(/login/)
    })

    test('should allow access to public booking page', async ({ page }) => {
      const response = await page.goto('/book')

      // Page should load (may redirect or show content)
      expect(response?.status()).toBeLessThan(500)
    })
  })
})

/**
 * CRITICAL: Protected Route Tests
 *
 * Attorney-client privilege requires that unauthenticated users
 * cannot access any protected routes. These tests verify that
 * all protected routes redirect to login when unauthenticated.
 */
test.describe('Protected Routes - Unauthenticated Access', () => {
  // Test each protected route individually for clear failure reporting
  for (const route of PROTECTED_ROUTES) {
    test(`should redirect ${route.path} (${route.name}) to login when unauthenticated`, async ({ page }) => {
      await page.goto(route.path)

      // Should redirect to login
      await expect(page).toHaveURL(/login/, {
        timeout: 10000
      })
    })
  }
})

/**
 * API Authentication Tests
 *
 * Verify that protected API endpoints return 401 when accessed
 * without authentication.
 */
test.describe('Protected API Endpoints - Unauthenticated Access', () => {
  // Firm-only endpoints
  const firmEndpoints = [
    '/api/clients',
    '/api/matters',
    '/api/documents',
    '/api/templates',
    '/api/client-journeys',
    '/api/services',
  ]

  for (const endpoint of firmEndpoints) {
    test(`should require auth for ${endpoint}`, async ({ request }) => {
      const response = await request.get(endpoint)

      expect(response.status()).toBe(401)
    })
  }

  // Admin endpoints
  const adminEndpoints = [
    '/api/users',
    '/api/oauth-providers',
  ]

  for (const endpoint of adminEndpoints) {
    test(`should require auth for admin endpoint ${endpoint}`, async ({ request }) => {
      const response = await request.get(endpoint)

      expect(response.status()).toBe(401)
    })
  }

  // Client-specific endpoints
  const clientEndpoints = [
    '/api/my-matters',
    '/api/my-journeys',
    '/api/client/stats',
  ]

  for (const endpoint of clientEndpoints) {
    test(`should require auth for client endpoint ${endpoint}`, async ({ request }) => {
      const response = await request.get(endpoint)

      expect(response.status()).toBe(401)
    })
  }
})

test.describe('Session API', () => {
  test('should return null user when not authenticated', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data.user).toBeNull()
  })

  test('should return success on logout even when not authenticated', async ({ request }) => {
    const response = await request.post('/api/auth/logout')

    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

test.describe('Login API Validation', () => {
  test('should reject invalid email format', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'not-an-email',
        password: 'password123'
      }
    })

    expect(response.status()).toBe(400)
  })

  test('should reject short password', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: '12345'
      }
    })

    expect(response.status()).toBe(400)
  })

  test('should reject non-existent user', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'password123'
      }
    })

    expect(response.status()).toBe(401)
  })
})

/**
 * Sensitive Data Protection Tests
 *
 * Verify that endpoints containing sensitive client data
 * are properly protected and return appropriate error codes.
 */
test.describe('Sensitive Data Protection', () => {
  test('should not expose client data without auth', async ({ request }) => {
    // Attempt to access a specific client
    const response = await request.get('/api/clients/some-client-id')

    expect(response.status()).toBe(401)
  })

  test('should not expose matter data without auth', async ({ request }) => {
    const response = await request.get('/api/matters/some-matter-id')

    expect(response.status()).toBe(401)
  })

  test('should not expose document data without auth', async ({ request }) => {
    const response = await request.get('/api/documents/some-doc-id')

    expect(response.status()).toBe(401)
  })

  test('should not expose journey data without auth', async ({ request }) => {
    const response = await request.get('/api/client-journeys/some-journey-id')

    expect(response.status()).toBe(401)
  })
})
