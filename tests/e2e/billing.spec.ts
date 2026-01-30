import { test, expect } from '@playwright/test'

/**
 * Billing Module E2E Tests
 *
 * These tests verify the billing and trust accounting functionality.
 * They specifically guard against:
 * - Routing issues (e.g., /billing vs /billing/trust rendering correctly)
 * - Modal display issues (modelValue prop errors)
 * - Form interactions and validation
 *
 * IMPORTANT: These tests require authentication. They use the login helper
 * to authenticate as a firm member before running billing tests.
 */

// Helper to login as a firm member
// Uses seed data credentials from server/db/seed.ts
async function loginAsFirmMember(page: any) {
  await page.goto('/login')
  await page.getByPlaceholder(/example\.com/i).fill('admin@trustandlegacy.test')
  await page.getByPlaceholder(/••••/).fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for dashboard to load (successful login)
  await page.waitForURL(/\/(dashboard|billing|matters|clients)/, { timeout: 10000 })
}

test.describe('Billing Module', () => {

  test.describe('Page Routing', () => {
    /**
     * CRITICAL: This test catches the routing bug where billing.vue
     * acted as a parent layout for billing/trust.vue, causing the
     * invoices table to appear on the trust page.
     */
    test('billing dashboard shows invoices content, not trust content', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')

      // Should show billing dashboard header
      await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible()

      // Should show invoice-related content
      await expect(page.getByText(/outstanding/i)).toBeVisible()
      await expect(page.getByText(/overdue/i)).toBeVisible()

      // Should have Create Invoice button
      await expect(page.getByRole('button', { name: /create invoice/i })).toBeVisible()

      // Should have Trust Accounts navigation button
      await expect(page.getByRole('button', { name: /trust accounts/i })).toBeVisible()
    })

    test('trust page shows trust content, not invoices list', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')

      // Should show trust account header
      await expect(page.getByRole('heading', { name: /trust account/i })).toBeVisible()

      // Should show trust-specific content
      await expect(page.getByText(/iolta/i)).toBeVisible()

      // Should have trust-specific buttons
      await expect(page.getByRole('button', { name: /reconcile/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /record deposit/i })).toBeVisible()

      // Should NOT show invoice tabs (these belong on /billing, not /billing/trust)
      await expect(page.getByRole('button', { name: /create invoice/i })).not.toBeVisible()
    })

    test('billing and trust pages have distinct breadcrumb navigation', async ({ page }) => {
      await loginAsFirmMember(page)

      // Check billing page
      await page.goto('/billing')
      // Billing dashboard is the root - no breadcrumb to parent

      // Check trust page has breadcrumb back to billing
      await page.goto('/billing/trust')
      await expect(page.getByRole('link', { name: /billing/i })).toBeVisible()
    })

    test('can navigate from billing to trust and back', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Navigate to trust via the header button
      await page.getByRole('button', { name: 'Trust Accounts' }).click()
      await page.waitForURL(/\/billing\/trust/)
      await expect(page.getByRole('heading', { name: /trust account/i })).toBeVisible()

      // Navigate back to billing via sidebar link
      await page.getByRole('link', { name: 'Invoices' }).click()
      await page.waitForURL(/\/billing$/)
    })
  })

  test.describe('Create Invoice Modal', () => {
    /**
     * CRITICAL: This test catches the modelValue prop issue where
     * modals wouldn't render because UiModal requires modelValue.
     *
     * Note: UiModal doesn't have role="dialog", so we use the modal
     * container selector (.fixed.inset-0.z-50) and title text instead.
     */
    test('create invoice modal opens when button is clicked', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle')

      // Click create invoice button (the one in the header, not in form)
      const createButton = page.getByRole('button', { name: 'Create Invoice' })
      await expect(createButton).toBeVisible()
      await createButton.click()

      // Wait for modal to appear - UiModal uses Teleport and Transition
      // The modal title should appear when modal is open
      await expect(page.locator('h3:has-text("Create Invoice")')).toBeVisible({ timeout: 10000 })

      // Form elements should be present (use more specific selectors)
      await expect(page.getByText('Matter *')).toBeVisible()
      await expect(page.getByText('Line Items *')).toBeVisible()
    })

    test('create invoice modal closes when cancel is clicked', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const modalTitle = page.locator('h3:has-text("Create Invoice")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Modal should close
      await expect(modalTitle).not.toBeVisible()
    })

    test('create invoice modal closes when backdrop is clicked', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const modalTitle = page.locator('h3:has-text("Create Invoice")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Click backdrop (the dark overlay outside the modal)
      await page.locator('.fixed.inset-0.bg-black.bg-opacity-50').click({ position: { x: 10, y: 10 } })

      // Modal should close
      await expect(modalTitle).not.toBeVisible()
    })

    test('create invoice form shows validation state', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: 'Create Invoice' }).click()
      const modalTitle = page.locator('h3:has-text("Create Invoice")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // The submit button inside the modal should be disabled when form is empty
      // Find the modal container (teleported to body) and look for submit button
      const modalForm = page.locator('form:has(button:has-text("Create Invoice"))')
      const submitButton = modalForm.locator('button[type="submit"]')
      await expect(submitButton).toBeDisabled()
    })
  })

  test.describe('Trust Account Modals', () => {
    test('record deposit modal opens and closes', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')
      await page.waitForLoadState('networkidle')

      // Click record deposit button
      await page.getByRole('button', { name: /record deposit/i }).click()

      // Modal should be visible - check for title
      const modalTitle = page.locator('h3:has-text("Record Trust Deposit")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Close modal
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(modalTitle).not.toBeVisible()
    })

    test('reconcile modal opens and closes', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')
      await page.waitForLoadState('networkidle')

      // Click reconcile button
      await page.getByRole('button', { name: /reconcile/i }).click()

      // Modal should be visible - check for modal title
      const modalTitle = page.locator('h3:has-text("Trust Account Reconciliation")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Close modal via X button (close button in header)
      await page.locator('.sr-only:has-text("Close")').locator('..').click()
      await expect(modalTitle).not.toBeVisible()
    })

    test('create trust account modal opens when no account exists', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')
      await page.waitForLoadState('networkidle')

      // If no trust account exists, should show create button
      const createAccountButton = page.getByRole('button', { name: /create trust account/i })

      // This test is conditional - only runs if no trust account exists
      if (await createAccountButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createAccountButton.click()

        // Modal should be visible
        await expect(page.getByText(/account name/i)).toBeVisible({ timeout: 10000 })

        // Close modal
        await page.getByRole('button', { name: /cancel/i }).click()
        await expect(page.getByText(/account name/i)).not.toBeVisible()
      } else {
        // Trust account already exists, skip this test
        test.skip()
      }
    })
  })

  test.describe('Trust Account Tabs', () => {
    test('trust page has client balances, transactions, and aging tabs', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')

      // Check for tab navigation (only visible when trust account exists)
      const clientBalancesTab = page.getByRole('button', { name: /client balances/i })
      const transactionsTab = page.getByRole('button', { name: /transactions/i })
      const agingTab = page.getByRole('button', { name: /aging/i })

      // If trust account exists, tabs should be visible
      if (await clientBalancesTab.isVisible()) {
        await expect(transactionsTab).toBeVisible()
        await expect(agingTab).toBeVisible()

        // Click through tabs to verify content changes
        await transactionsTab.click()
        await expect(page.getByText(/date/i)).toBeVisible()

        await agingTab.click()
        await expect(page.getByText(/aging report/i)).toBeVisible()

        await clientBalancesTab.click()
      }
    })
  })

  test.describe('Billing Dashboard Tabs', () => {
    test('billing page has invoice filter tabs', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')

      // Check for tab navigation
      await expect(page.getByRole('button', { name: /all invoices/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /outstanding/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /overdue/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /drafts/i })).toBeVisible()
    })

    test('clicking tabs changes displayed invoices', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Click outstanding tab
      await page.getByRole('button', { name: /outstanding/i }).click()

      // Should show outstanding invoices (or empty state)
      // The tab should be active (has different styling with border-burgundy-500)
      const outstandingTab = page.getByRole('button', { name: /outstanding/i })
      await expect(outstandingTab).toHaveClass(/border-burgundy-500/)
    })
  })

  test.describe('Summary Cards', () => {
    test('billing dashboard shows summary cards', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')

      // Should show summary cards with amounts
      await expect(page.getByText(/outstanding/i)).toBeVisible()
      await expect(page.getByText(/overdue/i)).toBeVisible()
      await expect(page.getByText(/trust balance/i)).toBeVisible()
      await expect(page.getByText(/collected this month/i)).toBeVisible()
    })

    test('trust page shows trust balance summary', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/trust')

      // Should show trust balance (either in card or empty state)
      const balanceText = page.getByText(/trust balance/i)
      const noAccountText = page.getByText(/no trust account/i)

      // One of these should be visible
      await expect(balanceText.or(noAccountText)).toBeVisible()
    })
  })
})

test.describe('Time Entries Page', () => {
  test.describe('Page Routing', () => {
    test('time entries page loads with correct content', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')

      // Should show time tracking header
      await expect(page.getByRole('heading', { name: /time tracking/i })).toBeVisible()

      // Should show Create Time Entry button
      await expect(page.getByRole('button', { name: /create time entry/i })).toBeVisible()

      // Should show summary cards
      await expect(page.getByText(/this month/i)).toBeVisible()
      await expect(page.getByText(/pending approval/i)).toBeVisible()
      await expect(page.getByText(/ready to bill/i)).toBeVisible()
    })

    test('time entries page has status filter tabs', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')

      // Should show filter tabs
      await expect(page.getByRole('button', { name: /all entries/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /draft/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /submitted/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /approved/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /billed/i })).toBeVisible()
    })

    test('can navigate to time entries from billing sidebar', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      // Click on Time Entries in the sidebar (under Billing menu)
      await page.getByRole('link', { name: 'Time Entries' }).click()
      await page.waitForURL(/\/billing\/time-entries/)

      await expect(page.getByRole('heading', { name: /time tracking/i })).toBeVisible()
    })
  })

  test.describe('Create Time Entry Modal', () => {
    test('create time entry modal opens when button is clicked', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')
      await page.waitForLoadState('networkidle')

      // Click create time entry button
      await page.getByRole('button', { name: /create time entry/i }).click()

      // Modal should be visible
      const modalTitle = page.locator('h3:has-text("Create Time Entry")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Form elements should be present
      await expect(page.getByText('Matter *')).toBeVisible()
      await expect(page.getByText('Work Date *')).toBeVisible()
      await expect(page.getByText('Hours *')).toBeVisible()
      await expect(page.getByText('Description *')).toBeVisible()
      await expect(page.getByText('Billable', { exact: true })).toBeVisible()
    })

    test('create time entry modal closes when cancel is clicked', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: /create time entry/i }).click()
      const modalTitle = page.locator('h3:has-text("Create Time Entry")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Modal should close
      await expect(modalTitle).not.toBeVisible()
    })

    test('create time entry form has billable toggle enabled by default', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: /create time entry/i }).click()
      const modalTitle = page.locator('h3:has-text("Create Time Entry")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Billable toggle should be on by default (check for the toggle in "on" state)
      const billableToggle = page.locator('button[role="switch"]')
      await expect(billableToggle).toHaveAttribute('aria-checked', 'true')
    })

    test('create time entry form shows rate preview when matter is selected', async ({ page }) => {
      await loginAsFirmMember(page)
      await page.goto('/billing/time-entries')
      await page.waitForLoadState('networkidle')

      // Open modal
      await page.getByRole('button', { name: /create time entry/i }).click()
      const modalTitle = page.locator('h3:has-text("Create Time Entry")')
      await expect(modalTitle).toBeVisible({ timeout: 10000 })

      // Search for a matter in the autocomplete
      const matterInput = page.getByPlaceholder(/search for a matter/i)
      await matterInput.fill('Doe')

      // Wait for autocomplete results and click first result
      const matterOption = page.locator('[role="option"]').first()
      if (await matterOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await matterOption.click()

        // Rate preview section should appear
        await expect(page.getByText(/hourly rate/i)).toBeVisible({ timeout: 5000 })
        await expect(page.getByText(/rate source/i)).toBeVisible()
      }
    })
  })
})

test.describe('Matter Billing Tab', () => {
  // Helper to navigate to matter and click Billing tab
  async function goToMatterBillingTab(page: any) {
    await page.goto('/matters')
    await page.waitForLoadState('networkidle')

    // Click on first matter in the list
    const matterRow = page.locator('tbody tr').first()
    await matterRow.click()

    // Should navigate to matter detail
    await page.waitForURL(/\/matters\//)
    await page.waitForLoadState('networkidle')

    // Click Billing tab in the navigation bar (not the sidebar Billing menu)
    // The tabs are in a nav element with -mb-px class, inside the main content area
    const tabNav = page.locator('nav.-mb-px')
    const billingTab = tabNav.getByRole('button', { name: 'Billing' })
    await expect(billingTab).toBeVisible()
    await billingTab.click()

    // Wait for the Billing tab content to load - look for "Billing Actions" text
    await expect(page.getByText('Billing Actions', { exact: true })).toBeVisible({ timeout: 10000 })
  }

  test('matter page has Billing tab', async ({ page }) => {
    await loginAsFirmMember(page)
    await page.goto('/matters')
    await page.waitForLoadState('networkidle')

    // Click on first matter in the list
    const matterRow = page.locator('tbody tr').first()
    await matterRow.click()

    // Should navigate to matter detail
    await page.waitForURL(/\/matters\//)

    // Should have Billing tab (renamed from Payments) - check within the tab navigation
    const tabNav = page.locator('nav.-mb-px')
    await expect(tabNav.getByRole('button', { name: 'Billing' })).toBeVisible()
  })

  test('matter Billing tab shows time entries section', async ({ page }) => {
    await loginAsFirmMember(page)
    await goToMatterBillingTab(page)

    // Should show Log Time button in Billing Actions
    await expect(page.getByRole('button', { name: 'Log Time' }).first()).toBeVisible()

    // Scroll down to Time Entries section
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(500)

    // Should show Time Entries heading
    await expect(page.getByText('Time Entries', { exact: true })).toBeVisible({ timeout: 10000 })

    // Should show link to all time entries
    await expect(page.getByRole('link', { name: /view all time entries/i })).toBeVisible()
  })

  test('matter Billing tab shows billing rates card', async ({ page }) => {
    await loginAsFirmMember(page)
    await goToMatterBillingTab(page)

    // Scroll down to see billing rates card
    await page.evaluate(() => window.scrollTo(0, 300))
    await page.waitForTimeout(500)

    // Should show Billing Rates text
    await expect(page.getByText('Billing Rates', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('Log Time button opens time entry modal from matter page', async ({ page }) => {
    await loginAsFirmMember(page)
    await goToMatterBillingTab(page)

    // Click Log Time button (the first one in Billing Actions)
    const logTimeButton = page.getByRole('button', { name: 'Log Time' }).first()
    await expect(logTimeButton).toBeVisible()
    await logTimeButton.click()

    // Modal should open
    const modalTitle = page.locator('h3:has-text("Create Time Entry")')
    await expect(modalTitle).toBeVisible({ timeout: 10000 })

    // Modal should have form fields
    await expect(page.getByText('Matter *')).toBeVisible()
    await expect(page.getByText('Hours *')).toBeVisible()
  })

  test('matter Billing tab shows summary cards', async ({ page }) => {
    await loginAsFirmMember(page)
    await goToMatterBillingTab(page)

    // Should show summary cards (these are visible at the top of billing tab)
    await expect(page.getByText(/client trust balance/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/outstanding invoices/i)).toBeVisible()
    await expect(page.getByText(/total collected/i)).toBeVisible()
  })

  test('View All Time Entries link navigates to time entries page', async ({ page }) => {
    await loginAsFirmMember(page)
    await goToMatterBillingTab(page)

    // Scroll down to Time Entries section
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(500)

    // Click View All Time Entries link
    const viewAllLink = page.getByRole('link', { name: /view all time entries/i })
    await expect(viewAllLink).toBeVisible({ timeout: 10000 })
    await viewAllLink.click()

    // Should navigate to time entries page
    await page.waitForURL(/\/billing\/time-entries/)
    await expect(page.getByRole('heading', { name: /time tracking/i })).toBeVisible()
  })
})

test.describe('Billing Access Control', () => {
  test('unauthenticated users cannot access billing', async ({ page }) => {
    await page.goto('/billing')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('unauthenticated users cannot access trust accounts', async ({ page }) => {
    await page.goto('/billing/trust')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })

  test('unauthenticated users cannot access time entries', async ({ page }) => {
    await page.goto('/billing/time-entries')

    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })
})
