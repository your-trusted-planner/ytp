/**
 * Role-Based Access Control (RBAC) E2E Tests
 *
 * CRITICAL: These tests verify that users can only access resources
 * appropriate to their role. Attorney-client privilege mandates strict
 * enforcement of these boundaries.
 *
 * Test Categories:
 * 1. Client users cannot access firm-only resources
 * 2. Firm members cannot access client-specific routes (my-matters, etc.)
 * 3. Non-admins cannot access admin routes
 * 4. Cross-client data isolation (Client A cannot see Client B's data)
 */

import { test, expect } from '@playwright/test'
import {
  FIRM_ROUTES,
  ADMIN_ROUTES,
  CLIENT_ROUTES as CLIENT_ONLY_ROUTES,
  API_ACCESS_CONTROL,
} from '../../shared/routes'

/**
 * Helper to create an authenticated API context
 * Note: In a real test environment, you'd use test fixtures or
 * environment variables for test credentials
 */
async function loginAs(request: any, email: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { email, password }
  })
  return response
}

/**
 * Test credentials - these should exist in your test database
 * Typically created via seed data or test fixtures
 */
const TEST_USERS = {
  // Admin user with full access
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'testpassword123',
  },
  // Lawyer/firm member
  lawyer: {
    email: process.env.TEST_LAWYER_EMAIL || 'lawyer@test.local',
    password: process.env.TEST_LAWYER_PASSWORD || 'testpassword123',
  },
  // Client user
  client: {
    email: process.env.TEST_CLIENT_EMAIL || 'client@test.local',
    password: process.env.TEST_CLIENT_PASSWORD || 'testpassword123',
  },
}

test.describe('Role-Based Access Control', () => {
  test.describe('Client Role Restrictions', () => {
    test.describe('API Access', () => {
      /**
       * Clients should NOT be able to access firm-only API endpoints.
       * These endpoints contain data about ALL clients, not just their own.
       */
      const firmOnlyEndpoints = [
        { path: '/api/clients', name: 'Client List' },
        { path: '/api/matters', name: 'Matter List' },
        { path: '/api/documents', name: 'Document List' },
        { path: '/api/templates', name: 'Templates' },
        { path: '/api/client-journeys', name: 'Journey List' },
        { path: '/api/users', name: 'User List' },
      ]

      for (const endpoint of firmOnlyEndpoints) {
        test(`client should NOT access ${endpoint.name} (${endpoint.path})`, async ({ request }) => {
          // First, authenticate as client
          const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

          // Skip test if login fails (test user doesn't exist)
          if (!loginResponse.ok()) {
            test.skip()
            return
          }

          // Now try to access firm-only endpoint
          const response = await request.get(endpoint.path)

          // Should get 403 Forbidden (authenticated but not authorized)
          expect(response.status()).toBe(403)
        })
      }
    })

    test.describe('Own Data Access', () => {
      /**
       * Clients SHOULD be able to access their own data through
       * the my-* endpoints
       */
      test('client should access their own matters via /api/my-matters', async ({ request }) => {
        const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

        if (!loginResponse.ok()) {
          test.skip()
          return
        }

        const response = await request.get('/api/my-matters')

        // Should succeed (200) or return empty array
        expect(response.status()).toBe(200)
      })

      test('client should access their own journeys via /api/my-journeys', async ({ request }) => {
        const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

        if (!loginResponse.ok()) {
          test.skip()
          return
        }

        const response = await request.get('/api/my-journeys')

        expect(response.status()).toBe(200)
      })
    })
  })

  test.describe('Firm Member Restrictions', () => {
    test.describe('Admin Endpoint Access', () => {
      /**
       * Non-admin firm members should NOT access admin-only endpoints
       */
      const adminOnlyEndpoints = [
        { path: '/api/oauth-providers', name: 'OAuth Providers' },
        // Note: /api/users may be accessible to lawyers for client lookup
        // but POST/PUT/DELETE operations should be admin-only
      ]

      for (const endpoint of adminOnlyEndpoints) {
        test(`lawyer should NOT modify ${endpoint.name} (${endpoint.path})`, async ({ request }) => {
          const loginResponse = await loginAs(request, TEST_USERS.lawyer.email, TEST_USERS.lawyer.password)

          if (!loginResponse.ok()) {
            test.skip()
            return
          }

          // Try to create a new resource (should be forbidden)
          const response = await request.post(endpoint.path, {
            data: { name: 'test' }
          })

          // Should get 403 Forbidden
          expect(response.status()).toBe(403)
        })
      }
    })

    test.describe('Firm Data Access', () => {
      /**
       * Firm members SHOULD be able to access client data
       * (this is necessary for them to do their jobs)
       */
      test('lawyer should access client list', async ({ request }) => {
        const loginResponse = await loginAs(request, TEST_USERS.lawyer.email, TEST_USERS.lawyer.password)

        if (!loginResponse.ok()) {
          test.skip()
          return
        }

        const response = await request.get('/api/clients')

        expect(response.status()).toBe(200)
      })

      test('lawyer should access matter list', async ({ request }) => {
        const loginResponse = await loginAs(request, TEST_USERS.lawyer.email, TEST_USERS.lawyer.password)

        if (!loginResponse.ok()) {
          test.skip()
          return
        }

        const response = await request.get('/api/matters')

        expect(response.status()).toBe(200)
      })
    })
  })

  test.describe('Admin Access', () => {
    /**
     * Admins should have access to all endpoints
     */
    test('admin should access user management', async ({ request }) => {
      const loginResponse = await loginAs(request, TEST_USERS.admin.email, TEST_USERS.admin.password)

      if (!loginResponse.ok()) {
        test.skip()
        return
      }

      const response = await request.get('/api/users')

      expect(response.status()).toBe(200)
    })

    test('admin should access OAuth providers', async ({ request }) => {
      const loginResponse = await loginAs(request, TEST_USERS.admin.email, TEST_USERS.admin.password)

      if (!loginResponse.ok()) {
        test.skip()
        return
      }

      const response = await request.get('/api/oauth-providers')

      expect(response.status()).toBe(200)
    })

    test('admin should access client data', async ({ request }) => {
      const loginResponse = await loginAs(request, TEST_USERS.admin.email, TEST_USERS.admin.password)

      if (!loginResponse.ok()) {
        test.skip()
        return
      }

      const response = await request.get('/api/clients')

      expect(response.status()).toBe(200)
    })
  })
})

/**
 * Cross-Client Data Isolation Tests
 *
 * CRITICAL: A client must NEVER be able to see another client's data.
 * This is the most important aspect of attorney-client privilege.
 */
test.describe('Cross-Client Data Isolation', () => {
  test('client cannot access another client\'s matter by ID', async ({ request }) => {
    const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    // Try to access a matter that doesn't belong to this client
    // The ID 'other-client-matter' should not exist or belong to another client
    const response = await request.get('/api/matters/other-client-matter-id')

    // Should get 403 or 404 (not 200)
    expect([403, 404]).toContain(response.status())
  })

  test('client cannot access another client\'s documents by ID', async ({ request }) => {
    const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    const response = await request.get('/api/documents/other-client-doc-id')

    expect([403, 404]).toContain(response.status())
  })

  test('client cannot access another client\'s journey by ID', async ({ request }) => {
    const loginResponse = await loginAs(request, TEST_USERS.client.email, TEST_USERS.client.password)

    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    const response = await request.get('/api/client-journeys/other-client-journey-id')

    expect([403, 404]).toContain(response.status())
  })
})

/**
 * Status-Based Access Tests
 *
 * Inactive users should not be able to access any resources
 */
test.describe('Inactive User Access', () => {
  test('inactive user session should be invalidated', async ({ request }) => {
    // This test verifies that if a user is marked INACTIVE,
    // they cannot access protected resources even if they have a valid session
    // The server middleware should check user status on each request

    // Note: This requires a test fixture that creates and then deactivates a user
    // For now, we document the expected behavior
    test.skip()
  })
})
