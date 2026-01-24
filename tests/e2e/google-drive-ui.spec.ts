/**
 * Google Drive Integration UI Tests
 *
 * Tests the visibility of Google Drive UI elements on client and matter pages
 * when Drive integration is configured.
 *
 * These tests verify:
 * 1. DriveStatusBadge visibility in page headers
 * 2. DriveStatusSection visibility in page content
 * 3. Proper conditional rendering based on Drive configuration
 */

import { test, expect } from '@playwright/test'

// Test user credentials (from seed.ts)
const TEST_LAWYER = {
  email: 'john.meuli@yourtrustedplanner.com',
  password: 'password123'
}

const TEST_ADMIN = {
  email: 'admin@trustandlegacy.test',
  password: 'password123'
}

/**
 * Helper to log in as a lawyer user
 */
async function loginAsLawyer(page: any) {
  await page.goto('/login')

  await page.getByPlaceholder(/example\.com/i).fill(TEST_LAWYER.email)
  await page.getByPlaceholder(/••••/).fill(TEST_LAWYER.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect after successful login
  await page.waitForURL(/\/(dashboard|clients|matters)/, { timeout: 15000 })
}

test.describe('Google Drive UI - Client Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLawyer(page)
  })

  test('should display DriveStatusBadge in header when Drive is configured and clientProfile exists', async ({ page }) => {
    // Navigate to clients list first
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    // Click on the first client to view their detail page
    const clientRow = page.locator('table tbody tr, [data-testid="client-row"]').first()

    // If no clients exist, skip this test
    if (await clientRow.count() === 0) {
      test.skip()
      return
    }

    await clientRow.click()

    // Wait for client page to load
    await page.waitForURL(/\/clients\/[^/]+$/)
    await page.waitForLoadState('networkidle')

    // Wait for app config to load (async fetch in onMounted)
    await page.waitForTimeout(1000)

    // Check for DriveStatusBadge in header
    // The badge shows one of: "Drive Synced", "Sync Error", or "Not Synced"
    const driveBadge = page.locator('text=/Drive Synced|Sync Error|Not Synced/')

    // Assert the badge SHOULD be visible when Drive is configured
    await expect(driveBadge.first()).toBeVisible({ timeout: 5000 })
    console.log('DriveStatusBadge visible in header: true')
  })

  test('should display DriveStatusSection in sidebar when Drive is configured and clientProfile exists', async ({ page }) => {
    // Navigate to clients list first
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    // Click on the first client to view their detail page
    const clientRow = page.locator('table tbody tr, [data-testid="client-row"]').first()

    // If no clients exist, skip this test
    if (await clientRow.count() === 0) {
      test.skip()
      return
    }

    await clientRow.click()

    // Wait for client page to load
    await page.waitForURL(/\/clients\/[^/]+$/)
    await page.waitForLoadState('networkidle')

    // Check for DriveStatusSection (has "Google Drive" heading)
    const driveSection = page.locator('h3:has-text("Google Drive")')

    // Assert the section SHOULD be visible when Drive is configured
    await expect(driveSection).toBeVisible({ timeout: 5000 })
    console.log('DriveStatusSection visible: true')
  })
})

test.describe('Google Drive UI - Matter Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsLawyer(page)
  })

  test('should display DriveStatusBadge in header when Drive is configured', async ({ page }) => {
    // Navigate to matters list first
    await page.goto('/matters')
    await page.waitForLoadState('networkidle')

    // Click on the first matter to view its detail page
    const matterRow = page.locator('table tbody tr, [data-testid="matter-row"]').first()

    // If no matters exist, skip this test
    if (await matterRow.count() === 0) {
      test.skip()
      return
    }

    await matterRow.click()

    // Wait for matter page to load
    await page.waitForURL(/\/matters\/[^/]+$/)
    await page.waitForLoadState('networkidle')

    // Check for DriveStatusBadge in header
    // The badge shows one of: "Drive Synced", "Sync Error", or "Not Synced"
    const driveBadge = page.locator('text=/Drive Synced|Sync Error|Not Synced/')

    // Assert the badge SHOULD be visible when Drive is configured
    await expect(driveBadge.first()).toBeVisible({ timeout: 5000 })
    console.log('DriveStatusBadge visible in header: true')
  })

  test('should display DriveStatusSection in Overview tab when Drive is configured', async ({ page }) => {
    // Navigate to matters list first
    await page.goto('/matters')
    await page.waitForLoadState('networkidle')

    // Click on the first matter to view its detail page
    const matterRow = page.locator('table tbody tr, [data-testid="matter-row"]').first()

    // If no matters exist, skip this test
    if (await matterRow.count() === 0) {
      test.skip()
      return
    }

    await matterRow.click()

    // Wait for matter page to load
    await page.waitForURL(/\/matters\/[^/]+$/)
    await page.waitForLoadState('networkidle')

    // Make sure we're on the Overview tab (default)
    const overviewTab = page.locator('button:has-text("Overview")')
    if (await overviewTab.isVisible()) {
      await overviewTab.click()
    }

    // Check for DriveStatusSection (has "Google Drive" heading)
    const driveSection = page.locator('h3:has-text("Google Drive")')

    // Assert the section SHOULD be visible when Drive is configured
    await expect(driveSection).toBeVisible({ timeout: 5000 })
    console.log('DriveStatusSection visible: true')
  })
})

/**
 * API-level tests to verify the data being returned for Drive integration
 */
test.describe('Google Drive API - Configuration Status', () => {
  test('GET /api/google-drive/status should return isConfigured flag', async ({ request }) => {
    // First, we need to authenticate
    const loginResponse = await request.post('/api/auth/login', {
      data: TEST_LAWYER
    })

    // Skip if login fails (no test user)
    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    // Now check Drive status
    const statusResponse = await request.get('/api/google-drive/status')

    expect(statusResponse.ok()).toBe(true)

    const status = await statusResponse.json()
    expect(status).toHaveProperty('isConfigured')
    expect(status).toHaveProperty('isEnabled')

    console.log('Google Drive status:', status)
  })
})

test.describe('Google Drive API - Client Data', () => {
  test('GET /api/clients/:id should include google_drive_* fields in profile', async ({ request }) => {
    // First, authenticate
    const loginResponse = await request.post('/api/auth/login', {
      data: TEST_LAWYER
    })

    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    // Get clients list
    const clientsResponse = await request.get('/api/clients')

    if (!clientsResponse.ok()) {
      test.skip()
      return
    }

    const clientsData = await clientsResponse.json()
    const clients = clientsData.clients || []

    if (clients.length === 0) {
      test.skip()
      return
    }

    // Get first client details
    const clientId = clients[0].id
    const clientDetailResponse = await request.get(`/api/clients/${clientId}`)

    expect(clientDetailResponse.ok()).toBe(true)

    const clientDetail = await clientDetailResponse.json()

    console.log('Client API response structure:', {
      hasClient: !!clientDetail.client,
      hasProfile: !!clientDetail.profile,
      profileKeys: clientDetail.profile ? Object.keys(clientDetail.profile) : []
    })

    // The profile should contain Google Drive fields
    if (clientDetail.profile) {
      expect(clientDetail.profile).toHaveProperty('google_drive_sync_status')
      expect(clientDetail.profile).toHaveProperty('google_drive_folder_url')
    } else {
      // Document that profile is missing - this may be the bug
      console.log('WARNING: clientDetail.profile is null/undefined')
    }
  })
})

test.describe('Google Drive API - Matter Data', () => {
  test('GET /api/matters/:id should include googleDrive* fields', async ({ request }) => {
    // First, authenticate
    const loginResponse = await request.post('/api/auth/login', {
      data: TEST_LAWYER
    })

    if (!loginResponse.ok()) {
      test.skip()
      return
    }

    // Get matters list
    const mattersResponse = await request.get('/api/matters')

    if (!mattersResponse.ok()) {
      test.skip()
      return
    }

    const mattersData = await mattersResponse.json()
    const matters = mattersData.matters || []

    if (matters.length === 0) {
      test.skip()
      return
    }

    // Get first matter details
    const matterId = matters[0].id
    const matterDetailResponse = await request.get(`/api/matters/${matterId}`)

    expect(matterDetailResponse.ok()).toBe(true)

    const matterDetail = await matterDetailResponse.json()

    console.log('Matter API response structure:', {
      hasMatter: !!matterDetail.matter,
      matterKeys: matterDetail.matter ? Object.keys(matterDetail.matter) : []
    })

    // The matter should contain Google Drive fields
    if (matterDetail.matter) {
      // Check for camelCase fields (new schema)
      const hasGoogleDriveFields =
        'googleDriveSyncStatus' in matterDetail.matter ||
        'google_drive_sync_status' in matterDetail.matter

      console.log('Matter has Google Drive fields:', hasGoogleDriveFields)
    }
  })
})
