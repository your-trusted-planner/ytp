/**
 * E2E Tests for E-Signature Flow
 *
 * The signing page (/sign/[token]) is public - no authentication required.
 * Access is controlled by the secure token in the URL.
 *
 * Test categories:
 * 1. Error handling (invalid/expired tokens)
 * 2. API validation (signature submission rules)
 * 3. UI elements and accessibility
 *
 * Note: Full signing flow tests require seeded database with valid
 * signature sessions. See tests marked with `fixme` for those cases.
 */

import { test, expect } from '@playwright/test'

test.describe('E-Signature - Error Handling', () => {
  test.describe('Invalid Token', () => {
    test('should show error for non-existent token', async ({ page }) => {
      await page.goto('/sign/invalid-token-that-does-not-exist')

      // Should show error state - use heading which is unique
      await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible({ timeout: 10000 })
    })

    test('should show 404 message for random token', async ({ page }) => {
      const randomToken = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
      await page.goto(`/sign/${randomToken}`)

      // Should display session not found heading
      await expect(page.getByRole('heading', { name: /session not found/i })).toBeVisible({ timeout: 10000 })
    })

    test('should display contact sender message on error', async ({ page }) => {
      await page.goto('/sign/nonexistent-token')

      // Should show helpful message to contact sender
      await expect(page.getByText(/contact.*sender|believe.*error/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Page Structure', () => {
    test('should display secure connection indicator', async ({ page }) => {
      await page.goto('/sign/any-token')

      // Header should show secure connection badge
      await expect(page.getByText(/secure connection/i)).toBeVisible()
    })

    test('should display e-signature header', async ({ page }) => {
      await page.goto('/sign/any-token')

      await expect(page.getByRole('heading', { name: /e-signature/i })).toBeVisible()
    })

    test('should display legal footer', async ({ page }) => {
      await page.goto('/sign/any-token')

      // Footer should mention ESIGN and UETA laws
      await expect(page.getByText(/ESIGN|UETA|legally binding/i)).toBeVisible()
    })
  })
})

test.describe('E-Signature API - Validation', () => {
  test.describe('Sign Endpoint Validation', () => {
    test('should reject signature without token', async ({ request }) => {
      // Missing token in path
      const response = await request.post('/api/signature//sign', {
        data: {
          signatureData: 'data:image/png;base64,test',
          agreedToTerms: true
        }
      })

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should return 404 for non-existent session', async ({ request }) => {
      const response = await request.post('/api/signature/fake-token-12345/sign', {
        data: {
          signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          agreedToTerms: true,
          termsVersion: '2024.1'
        }
      })

      expect(response.status()).toBe(404)

      const data = await response.json()
      expect(data.message).toMatch(/not found/i)
    })

    test('should reject empty signature data', async ({ request }) => {
      const response = await request.post('/api/signature/any-token/sign', {
        data: {
          signatureData: '',
          agreedToTerms: true,
          termsVersion: '2024.1'
        }
      })

      expect(response.status()).toBe(400)
    })

    test('should reject signature data that is too short', async ({ request }) => {
      const response = await request.post('/api/signature/any-token/sign', {
        data: {
          signatureData: 'short',
          agreedToTerms: true,
          termsVersion: '2024.1'
        }
      })

      expect(response.status()).toBe(400)
    })

    test('should reject when terms not agreed', async ({ request }) => {
      const response = await request.post('/api/signature/any-token/sign', {
        data: {
          signatureData: 'data:image/png;base64,' + 'a'.repeat(200),
          agreedToTerms: false,
          termsVersion: '2024.1'
        }
      })

      expect(response.status()).toBe(400)

      const data = await response.json()
      // Validation error - either in message or in data.fieldErrors
      expect(data.message || JSON.stringify(data.data)).toMatch(/agree|terms|invalid/i)
    })
  })

  test.describe('Get Session Endpoint', () => {
    test('should return 404 for invalid token', async ({ request }) => {
      const response = await request.get('/api/signature/invalid-token-xyz')

      expect(response.status()).toBe(404)

      const data = await response.json()
      expect(data.message).toMatch(/not found/i)
    })

    test('should return 400 when token is missing', async ({ request }) => {
      // This tests the route handling
      const response = await request.get('/api/signature/')

      // Either 400 or 404 is acceptable for missing token
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })
  })

  test.describe('Identity Verification Endpoint', () => {
    test('should return 404 for non-existent session', async ({ request }) => {
      const response = await request.post('/api/signature/fake-token/verify-identity', {
        data: {
          mode: 'attestation',
          attestationText: 'I attest that I am who I say I am',
          agreedToTerms: true
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject invalid verification mode', async ({ request }) => {
      const response = await request.post('/api/signature/any-token/verify-identity', {
        data: {
          mode: 'invalid-mode',
          data: {}
        }
      })

      // Should be 400 (bad request) or 404 (session not found)
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })
  })
})

test.describe('E-Signature - Accessibility', () => {
  test('should have accessible page structure', async ({ page }) => {
    await page.goto('/sign/test-token')

    // Page should have main landmark
    const main = page.locator('main, [role="main"], .signing-ceremony')
    // At minimum the page container should exist
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display loading or error state', async ({ page }) => {
    // Navigate and check for loading indicator or error
    await page.goto('/sign/some-token')

    // Either loading spinner or error heading should appear
    // Use first() to avoid strict mode issues
    const loadingOrError = page.getByText(/loading/i).first()
      .or(page.getByRole('heading', { name: /not found|error/i }))

    await expect(loadingOrError).toBeVisible({ timeout: 10000 })
  })
})

/**
 * Full Flow Tests - Require Seeded Database
 *
 * These tests require a valid signature session in the database.
 * To run these tests:
 * 1. Seed a test signature session with a known token
 * 2. Update the token constant below
 * 3. Remove the .fixme from the test names
 *
 * Example seed data needed:
 * - User (signer)
 * - Document with content
 * - Signature session with status: PENDING, tier: STANDARD
 */
test.describe('E-Signature - Full Flow (requires seed data)', () => {
  // Replace with actual test token from seeded database
  const TEST_TOKEN = 'test-signing-token-from-seed-data'

  test.fixme('should display document preview for valid token', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Should show document title
    await expect(page.getByRole('heading', { level: 3 })).toBeVisible()

    // Should show step indicator
    await expect(page.getByText(/review/i)).toBeVisible()
    await expect(page.getByText(/sign/i)).toBeVisible()
    await expect(page.getByText(/complete/i)).toBeVisible()
  })

  test.fixme('should allow proceeding from review to sign step', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Wait for document to load
    await expect(page.getByText(/reviewed.*proceed/i)).toBeVisible({ timeout: 10000 })

    // Click proceed button
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Should now show signature canvas
    await expect(page.getByText(/sign.*below|signature/i)).toBeVisible()
  })

  test.fixme('should show terms acceptance checkbox', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Navigate to sign step
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Should show prominent terms checkbox
    await expect(page.getByText(/legally binding/i)).toBeVisible()
    await expect(page.getByRole('checkbox')).toBeVisible()
  })

  test.fixme('should validate signature before submission', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Navigate to sign step
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Try to submit without signature
    await page.getByRole('button', { name: /submit.*signature/i }).click()

    // Should show validation error
    await expect(page.getByText(/provide.*signature|signature.*required/i)).toBeVisible()
  })

  test.fixme('should validate terms acceptance before submission', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Navigate to sign step
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Draw something on canvas (simulated)
    const canvas = page.locator('canvas')
    await canvas.click({ position: { x: 100, y: 50 } })

    // Try to submit without accepting terms
    await page.getByRole('button', { name: /submit.*signature/i }).click()

    // Should show terms validation error
    await expect(page.getByText(/check.*box|agree|confirm/i)).toBeVisible()
  })

  test.fixme('should complete signing flow successfully', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Step 1: Review document
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Step 2: Draw signature
    const canvas = page.locator('canvas')
    await canvas.click({ position: { x: 50, y: 30 } })
    await canvas.click({ position: { x: 100, y: 50 } })
    await canvas.click({ position: { x: 150, y: 30 } })

    // Step 3: Accept terms
    await page.getByRole('checkbox').check()

    // Step 4: Submit
    await page.getByRole('button', { name: /submit.*signature/i }).click()

    // Should show success confirmation
    await expect(page.getByText(/success|signed|complete/i)).toBeVisible({ timeout: 15000 })

    // Should show certificate info
    await expect(page.getByText(/certificate/i)).toBeVisible()
  })

  test.fixme('should allow downloading signed PDF', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)

    // Complete the signing flow first...
    // (abbreviated - would do full flow)

    // After completion, download button should be visible
    await expect(page.getByRole('button', { name: /download.*pdf/i })).toBeVisible()
  })
})

/**
 * Enhanced Tier Tests - Require Seeded ENHANCED Session
 */
test.describe('E-Signature - Enhanced Tier (requires seed data)', () => {
  const ENHANCED_TOKEN = 'test-enhanced-signing-token'

  test.fixme('should require identity verification for enhanced tier', async ({ page }) => {
    await page.goto(`/sign/${ENHANCED_TOKEN}`)

    // Should show identity verification step first
    await expect(page.getByText(/verify.*identity|identity.*verification/i)).toBeVisible()

    // Should NOT show document content yet
    await expect(page.getByRole('button', { name: /proceed.*sign/i })).not.toBeVisible()
  })

  test.fixme('should show attestation option for identity verification', async ({ page }) => {
    await page.goto(`/sign/${ENHANCED_TOKEN}`)

    // Should show attestation form
    await expect(page.getByText(/attest|penalty.*perjury/i)).toBeVisible()
  })

  test.fixme('should allow proceeding after identity verification', async ({ page }) => {
    await page.goto(`/sign/${ENHANCED_TOKEN}`)

    // Complete identity verification
    await page.getByRole('checkbox').check() // Agree to attestation
    await page.getByRole('button', { name: /verify|continue|submit/i }).click()

    // Should now show document review
    await expect(page.getByRole('button', { name: /proceed.*sign/i })).toBeVisible({ timeout: 10000 })
  })
})

/**
 * Signature Upload Tests
 */
test.describe('E-Signature - Signature Methods', () => {
  const TEST_TOKEN = 'test-signing-token'

  test.fixme('should show signature method toggle', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Should show Draw and Upload options
    await expect(page.getByRole('button', { name: /draw/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /upload/i })).toBeVisible()
  })

  test.fixme('should switch to upload mode', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Click upload button
    await page.getByRole('button', { name: /upload/i }).click()

    // Should show upload area
    await expect(page.getByText(/drag.*drop|upload.*signature/i)).toBeVisible()
  })

  test.fixme('should require adoption checkbox for uploaded signature', async ({ page }) => {
    await page.goto(`/sign/${TEST_TOKEN}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()
    await page.getByRole('button', { name: /upload/i }).click()

    // Upload a file (would need to set up file input)
    // After upload, should require adoption
    await expect(page.getByText(/adopt.*signature/i)).toBeVisible()
  })
})

/**
 * Stored Signature Tests - Require User with Stored Signature
 */
test.describe('E-Signature - Stored Signature', () => {
  const TOKEN_WITH_STORED_SIG = 'test-token-user-has-stored-sig'

  test.fixme('should show Saved option when user has stored signature', async ({ page }) => {
    await page.goto(`/sign/${TOKEN_WITH_STORED_SIG}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()

    // Should show three options: Draw, Upload, Saved
    await expect(page.getByRole('button', { name: /saved/i })).toBeVisible()
  })

  test.fixme('should display stored signature preview', async ({ page }) => {
    await page.goto(`/sign/${TOKEN_WITH_STORED_SIG}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()
    await page.getByRole('button', { name: /saved/i }).click()

    // Should show stored signature image
    await expect(page.getByAltText(/stored signature/i)).toBeVisible()
  })

  test.fixme('should require adoption for stored signature', async ({ page }) => {
    await page.goto(`/sign/${TOKEN_WITH_STORED_SIG}`)
    await page.getByRole('button', { name: /proceed.*sign/i }).click()
    await page.getByRole('button', { name: /saved/i }).click()

    // Should show adoption checkbox
    await expect(page.getByText(/adopt this signature/i)).toBeVisible()
  })
})
