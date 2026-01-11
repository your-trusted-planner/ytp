/**
 * Screenshot capture script for documentation
 *
 * Run with: npx playwright test tests/screenshots/capture-docs.ts
 *
 * Captures screenshots of key pages for the help documentation.
 * Screenshots are saved to doc/public_site/public/screenshots/
 */

import { test, expect, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOT_DIR = path.join(__dirname, '../../doc/public_site/public/screenshots')

// Test credentials
const LAWYER_EMAIL = 'lawyer@yourtrustedplanner.com'
const LAWYER_PASSWORD = 'password123'
const CLIENT_EMAIL = 'client@test.com'
const CLIENT_PASSWORD = 'password123'

// Screenshot options for consistency
const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Wait for ClientOnly to hydrate
  await page.waitForSelector('form', { timeout: 10000 })

  // Fill in credentials using placeholder text
  const emailInput = page.getByPlaceholder('you@example.com')
  const passwordInput = page.getByPlaceholder('••••••••')

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Click Sign In button and wait for navigation
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 15000 }),
    page.getByRole('button', { name: 'Sign In' }).click()
  ])

  await page.waitForLoadState('networkidle')

  // Give Vue time to hydrate
  await page.waitForTimeout(1500)
}

async function screenshot(page: Page, name: string, options?: { fullPage?: boolean }) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`)
  await page.screenshot({
    path: filepath,
    ...screenshotOptions,
    ...options
  })
  console.log(`  Captured: ${name}.png`)
}

// ============================================
// LAWYER SCREENSHOTS
// ============================================

test.describe('Lawyer Portal Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, LAWYER_EMAIL, LAWYER_PASSWORD)
  })

  test('lawyer-dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'lawyer-dashboard')
  })

  test('clients-list', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'clients-list')
  })

  test('client-detail', async ({ page }) => {
    // Go to clients list first
    await page.goto('/dashboard/clients')
    await page.waitForLoadState('networkidle')

    // Click on first client in the list
    const clientRow = page.locator('table tbody tr, [data-testid="client-row"]').first()
    if (await clientRow.isVisible()) {
      await clientRow.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await screenshot(page, 'client-detail')
    }
  })

  test('service-catalog', async ({ page }) => {
    await page.goto('/dashboard/service-catalog')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'service-catalog')
  })

  test('matters-list', async ({ page }) => {
    await page.goto('/dashboard/matters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'matters-list')
  })

  test('matter-detail', async ({ page }) => {
    // Go to matters list first
    await page.goto('/dashboard/matters')
    await page.waitForLoadState('networkidle')

    // Click on first matter in the list
    const matterRow = page.locator('table tbody tr, [data-testid="matter-row"]').first()
    if (await matterRow.isVisible()) {
      await matterRow.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await screenshot(page, 'matter-detail')
    }
  })

  test('journeys-list', async ({ page }) => {
    await page.goto('/dashboard/journeys')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'journeys-list')
  })

  test('journey-detail', async ({ page }) => {
    // Go to journeys list first
    await page.goto('/dashboard/journeys')
    await page.waitForLoadState('networkidle')

    // Click on first journey
    const journeyRow = page.locator('table tbody tr, [data-testid="journey-row"]').first()
    if (await journeyRow.isVisible()) {
      await journeyRow.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await screenshot(page, 'journey-detail')
    }
  })

  test('templates-list', async ({ page }) => {
    await page.goto('/dashboard/templates')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'templates-list')
  })

  test('documents-list', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'documents-list-lawyer')
  })
})

// ============================================
// CLIENT SCREENSHOTS
// ============================================

test.describe('Client Portal Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD)
  })

  test('client-dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'client-dashboard')
  })

  test('my-journeys', async ({ page }) => {
    await page.goto('/dashboard/my-journeys')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'client-my-journeys')
  })

  test('my-journey-detail', async ({ page }) => {
    await page.goto('/dashboard/my-journeys')
    await page.waitForLoadState('networkidle')

    // Click on first journey
    const journeyCard = page.locator('[data-testid="journey-card"], .journey-card, table tbody tr').first()
    if (await journeyCard.isVisible()) {
      await journeyCard.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await screenshot(page, 'client-journey-detail')
    }
  })

  test('my-matters', async ({ page }) => {
    await page.goto('/dashboard/my-matters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'client-my-matters')
  })

  test('my-documents', async ({ page }) => {
    await page.goto('/dashboard/documents')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'client-documents')
  })
})

// ============================================
// CONCEPT SCREENSHOTS (specific UI elements)
// ============================================

test.describe('Concept Screenshots', () => {
  test('login-page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await screenshot(page, 'login-page')
  })

  test('journey-progress-indicator', async ({ page }) => {
    await login(page, LAWYER_EMAIL, LAWYER_PASSWORD)

    // Find a journey with progress to screenshot
    await page.goto('/dashboard/journeys')
    await page.waitForLoadState('networkidle')

    const journeyRow = page.locator('table tbody tr').first()
    if (await journeyRow.isVisible()) {
      await journeyRow.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // Try to capture just the progress section if it exists
      const progressSection = page.locator('[data-testid="journey-progress"], .journey-progress, .progress-indicator').first()
      if (await progressSection.isVisible()) {
        await progressSection.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-progress-indicator.png') })
        console.log('  Captured: journey-progress-indicator.png')
      }
    }
  })
})
