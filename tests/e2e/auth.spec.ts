import { test, expect } from '@playwright/test'

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

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
    })

    test('should redirect to login when accessing clients unauthenticated', async ({ page }) => {
      await page.goto('/dashboard/clients')

      // Should redirect to login
      await expect(page).toHaveURL(/login/)
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
  })
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

test.describe('Login API', () => {
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

test.describe('Protected API Endpoints', () => {
  test('should require auth for /api/users', async ({ request }) => {
    const response = await request.get('/api/users')

    expect(response.status()).toBe(401)
  })

  test('should require auth for /api/clients', async ({ request }) => {
    const response = await request.get('/api/clients')

    expect(response.status()).toBe(401)
  })

  test('should require auth for /api/documents', async ({ request }) => {
    const response = await request.get('/api/documents')

    expect(response.status()).toBe(401)
  })
})
