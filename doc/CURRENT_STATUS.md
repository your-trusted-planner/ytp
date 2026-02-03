# Current Status - YTP Estate Planning Platform

**Last Updated**: 2026-01-28

## 📍 Where We Are Now

### Recently Completed ✅

#### Billing & Trust Accounting System - Phase 10: Matter/Client Integration (2026-01-28)
- **Status**: Complete ✅
- **What**: Enhanced matter and client detail pages with billing integration
- **Matter Detail Page Enhancements** (`/matters/[id]`):
  - Added client trust balance indicator in Quick Stats card
  - Link to client's trust ledger
  - Updated Payments tab with three action buttons: "Deposit to Trust", "Create Invoice", "Record Payment"
  - Added billing summary cards (Trust Balance, Outstanding Invoices, Total Collected)
  - Added Outstanding Invoices section showing due invoices with clickable links
  - Integrated modals: TrustDepositModal, CreateInvoiceModal, PaymentRecordModal
- **Client Detail Page Enhancements** (`/clients/[id]`):
  - Added Trust Account card with balance display and "Deposit" button
  - Link to full trust ledger page
  - Added Outstanding Invoices card showing up to 3 invoices with total
  - Integrated modals: TrustDepositModal, PaymentRecordModal
- **API Enhancement**:
  - Updated `/api/invoices` to support `status=outstanding` filter (SENT, VIEWED, PARTIALLY_PAID, OVERDUE)
- **Unit Tests**:
  - Created comprehensive test suite (117 tests) for billing utilities
  - `tests/unit/invoice-number.test.ts` - Invoice number validation/parsing
  - `tests/unit/trust-ledger.test.ts` - Trust ledger business logic
  - `tests/unit/trust-reports.test.ts` - Aging and reconciliation reports
  - `tests/unit/invoice-pdf-generator.test.ts` - PDF generation and calculations

#### Billing & Trust Accounting System (MVP) (2026-01-28)
- **Status**: Complete ✅
- **What**: Full law firm billing system with IOLTA-compliant trust accounting
- **Key Features**:
  - **Trust (IOLTA) Accounting**: Per-client ledgers, running balances, three-way reconciliation
  - **Full Invoicing**: Line items, PDF generation with pdf-lib, email delivery via Resend
  - **Flexible Payment Flow**: Retainers to trust, direct payments, or mixed
  - **Trust Disbursements**: Apply trust funds to pay invoices
  - **Trust Reports**: Three-way reconciliation, aging reports, client ledger statements

- **Database Schema** (added to `server/db/schema.ts`):
  - `trustAccounts` - IOLTA/trust accounts (single or multiple)
  - `clientTrustLedgers` - Per-client balances within trust accounts
  - `trustTransactions` - All deposits, disbursements, refunds with running balances
  - `invoices` - Full invoicing with status tracking, payment tracking
  - `invoiceLineItems` - Line items with types, quantities, prices
  - Modified `payments` - Added fundSource, trustTransactionId, invoiceId fields

- **Server Utilities Created**:
  - `server/utils/invoice-number.ts` - Sequential invoice number generation (INV-YYYY-NNNN)
  - `server/utils/trust-ledger.ts` - Trust balance operations, validation, client balances
  - `server/utils/trust-reports.ts` - Reconciliation, aging reports, client ledger statements
  - `server/utils/invoice-pdf-generator.ts` - Professional PDF invoices using pdf-lib

- **API Endpoints Created**:
  - **Trust Account**: `GET/POST /api/trust/accounts`, `GET /api/trust/accounts/[id]`
  - **Trust Operations**: `POST /api/trust/deposits`, `POST /api/trust/disbursements`, `POST /api/trust/refunds`
  - **Trust Queries**: `GET /api/trust/transactions`, `GET /api/trust/clients/[clientId]/ledger`, `GET /api/trust/clients/[clientId]/balance`
  - **Trust Reports**: `GET /api/trust/reconciliation`, `GET /api/trust/aging`
  - **Invoice CRUD**: `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/[id]`
  - **Invoice Actions**: `POST /api/invoices/[id]/send`, `POST /api/invoices/[id]/apply-trust`, `GET /api/invoices/[id]/pdf`
  - **Invoice Line Items**: `POST /api/invoices/[id]/line-items`, `PUT/DELETE /api/invoices/[id]/line-items/[lineId]`
  - **Payments**: `GET/POST /api/payments`
  - **Billing Dashboard**: `GET /api/billing/summary`, `GET /api/billing/outstanding`, `GET /api/billing/overdue`

- **UI Pages Created**:
  - `/billing` - Main billing dashboard with summary cards, invoice tabs, filters
  - `/billing/trust` - Trust account management with client balances, transactions, aging tabs
  - `/billing/trust/[clientId]` - Client trust ledger with transaction history
  - `/invoices/[id]` - Invoice detail with payment history, trust application, actions

- **UI Components Created**:
  - `BillingInvoiceTable.vue` - Invoice list with filtering and actions
  - `BillingCreateInvoiceModal.vue` - Create invoice with line items
  - `BillingTrustClientList.vue` - Clients with trust balances
  - `BillingTrustTransactionList.vue` - Transaction history with pagination
  - `BillingTrustAgingReport.vue` - Aging report with warnings
  - `BillingCreateTrustAccountModal.vue` - Create IOLTA account
  - `BillingTrustDepositModal.vue` - Record deposits to trust
  - `BillingTrustDisbursementModal.vue` - Record disbursements/refunds
  - `BillingReconciliationModal.vue` - Three-way reconciliation with bank balance entry
  - `BillingApplyTrustModal.vue` - Apply trust funds to invoice
  - `BillingPaymentRecordModal.vue` - Record direct payments

- **Navigation**: Added "Billing" section to dashboard sidebar with "Invoices" and "Trust Accounts" items

- **Activity Logging**: Added trust and invoice activity types for audit trail

- **Migration Required**: Run `npx drizzle-kit generate` then apply migration

#### Estate Plan Management API & UI Wiring (Phases 5-6) (2026-01-28)
- **Status**: Complete ✅
- **What**: Role CRUD, status transitions, client creation UI, and full UI-to-backend wiring
- **Phase 5 - API & UI Features**:
  - **Role CRUD Endpoints**:
    - `POST /api/estate-plans/:id/roles` - Add role with full validation (28 role types, 5 categories)
    - `PUT /api/estate-plans/:id/roles/:roleId` - Update role with partial updates
    - `DELETE /api/estate-plans/:id/roles/:roleId` - Soft delete (status=REMOVED) by default, hard delete via `?hardDelete=true` (admin level 2)
  - **Status Transitions Endpoint**: `PUT /api/estate-plans/:id/status`
    - State machine validation (DRAFT → ACTIVE → AMENDED/INCAPACITATED/ADMINISTERED → DISTRIBUTED → CLOSED)
    - Auto-creates plan events (PLAN_SIGNED, PLAN_AMENDED, etc.)
    - Auto-updates timestamps (effectiveDate, lastAmendedAt, administrationStartedAt, closedAt)
  - **Client Creation UI**: Enhanced WealthCounsel import to select which people become clients
    - "Create as Client" checkbox for grantors and fiduciaries
    - Quick actions: "Grantors as clients" vs "Fiduciaries as clients" (mutually exclusive)
    - Per-person `createAsClient` flag passed to import API
  - **Clients List Fix**: Updated `/api/clients` to query from `clients` table (Belly Button Principle) instead of legacy `users` table
- **Phase 6 - UI Wiring**:
  - All estate plan pages use real API calls (no mock data)
  - Loading states with spinners
  - Error handling (empty states, "not found" pages)
  - Import flow fully functional end-to-end
- **Files Created**:
  - `server/api/estate-plans/[id]/status.put.ts`
  - `server/api/estate-plans/[id]/roles/index.post.ts`
  - `server/api/estate-plans/[id]/roles/[roleId].put.ts`
  - `server/api/estate-plans/[id]/roles/[roleId].delete.ts`
- **Files Modified**:
  - `server/utils/entity-resolver.ts` - Added `estate_plan` entity type
  - `server/api/clients/index.get.ts` - Query clients table instead of users
  - `app/components/person/MatchCard.vue` - Added "Create as Client" checkbox
  - `app/components/person/MatchingReview.vue` - Track createAsClient decisions
  - `app/pages/settings/integrations/wealthcounsel/import.vue` - Pass createAsClient to API
  - `server/api/admin/integrations/wealthcounsel/import.post.ts` - Handle per-person createAsClient
- **Test Coverage**: 990 tests passing
- **Activity Logging**: All role operations and status changes logged

#### Estate Plan Delete with Activity Logging (2026-01-27)
- **Status**: Complete ✅
- **What**: Admin-only delete functionality for estate plans with cascading deletion and activity logging
- **Features**:
  - **Delete Endpoint**: `DELETE /api/admin/estate-plans/:id`
    - Requires admin level 2 (enforced by `/api/admin/*` middleware)
    - Query param `?deletePeople=true` to also delete associated people (default: unlink only)
    - Cascades through all related tables (roles, versions, events, trusts, wills, ancillary docs, matter links)
    - Returns detailed deletion summary
  - **Confirmation UI**: Modal with safeguards
    - Shows summary of what will be deleted (counts for each entity type)
    - Checkbox option to also delete people (with warning about potential failures)
    - Confirmation text input requiring exact plan name
    - Only visible to admin level 2+
  - **Activity Logging**: Full audit trail
    - New entity type: `estate_plan`
    - New activity types: `ESTATE_PLAN_CREATED`, `ESTATE_PLAN_UPDATED`, `ESTATE_PLAN_AMENDED`, `ESTATE_PLAN_IMPORTED`, `ESTATE_PLAN_STATUS_CHANGED`
    - Import logging with source, people created/linked, roles created
    - Delete logging with full summary of deleted entities
- **Files Created**:
  - `server/api/admin/estate-plans/[id].delete.ts` - Delete endpoint
  - `tests/unit/estate-plan-delete.test.ts` - 32 tests for delete logic
- **Files Modified**:
  - `server/utils/activity-logger.ts` - Added estate_plan entity type and activity types
  - `server/utils/activity-description.ts` - Added descriptions for estate plan activities
  - `server/api/admin/integrations/wealthcounsel/import.post.ts` - Added activity logging
  - `app/pages/estate-plans/[id].vue` - Added delete button and modal
- **Test Coverage**: 969 tests passing (32 new tests added)
- **Security**: Admin level 2 required at both UI and API levels

#### WealthCounsel Import - Person Deduplication & UI (2026-01-26)
- **Status**: Complete ✅
- **What**: Added comprehensive person deduplication to WealthCounsel import with a review UI
- **Problem**: When importing estate plans from WealthCounsel XML, people could be created as duplicates if they already existed in the system. Also, the same person could appear multiple times in plan roles.
- **Solution**:
  - **Person Matching Utilities**: Extracted reusable matching logic to `server/utils/person-matching.ts`
    - `PersonExtractor` class for batch extraction with role aggregation
    - `calculateMatchConfidence()` - Confidence scoring (SSN=99%, NAME_EMAIL=95%, NAME_DOB=85%, NAME_ONLY=60%)
    - `findPersonMatches()` / `findPersonMatchesBatch()` - Database matching
    - `buildDecisionLookup()` / `buildPersonIdLookupFromDecisions()` - Decision handling
  - **Person Matching UI**: Created Vue components for user review
    - `app/components/person/ConfidenceBadge.vue` - Badge showing match confidence with color coding
    - `app/components/person/MatchCard.vue` - Card for individual person with matches and radio buttons
    - `app/components/person/MatchingReview.vue` - Container with filter tabs, quick actions, summary
  - **Role Deduplication**: Fixed duplicate plan roles being created
    - Added deduplication in `transformRoles()` based on `(personId, roleType, forPersonId)` tuple
    - Prevents same person having same role type multiple times in a plan
- **Files Created**:
  - `server/utils/person-matching.ts` - Reusable matching utilities
  - `app/components/person/ConfidenceBadge.vue` - Match confidence badge
  - `app/components/person/MatchCard.vue` - Person match selection card
  - `app/components/person/MatchingReview.vue` - Person matching review container
  - `tests/unit/person-matching.test.ts` - 42 tests for matching utilities
- **Files Modified**:
  - `server/api/admin/integrations/wealthcounsel/parse.post.ts` - Uses PersonExtractor
  - `server/api/admin/integrations/wealthcounsel/import.post.ts` - Handles person decisions
  - `server/api/admin/integrations/wealthcounsel/pending/[parseId].get.ts` - Returns extractedPeople
  - `server/utils/wealthcounsel-transformers.ts` - Role deduplication fix
  - `app/pages/settings/integrations/wealthcounsel/import.vue` - Integrated PersonMatchingReview
  - `tests/unit/wealthcounsel-transformers.test.ts` - Added 5 deduplication tests
  - `tests/unit/wealthcounsel-import-api.test.ts` - Added person decision tests
- **Test Coverage**: 939 tests passing (7 new tests added)
- **UI Features**:
  - Filter tabs by role type (client, spouse, child, beneficiary, fiduciary) or "with matches"
  - Quick actions: "Accept all high-confidence matches", "Create all new"
  - Role-based color coding (client=blue, spouse=pink, child=purple, beneficiary=green, fiduciary=amber)
  - Import summary showing create vs link counts

#### Lawmatics Import - Comprehensive Duplicate Handling (2026-01-26)
- **Status**: Complete ✅
- **What**: Implemented duplicate detection for contacts during Lawmatics import to prevent cascade failures
- **Problem**: When a contact was skipped (duplicate OR filtered as non-person), it wasn't added to the lookup cache. This caused cascade failures:
  ```
  Contact skipped (duplicate) → NOT in peopleLookup
    → Prospect referencing that contact → FAILS (can't find person)
      → NOT in matterLookup
        → Notes referencing that prospect → FAILS (can't find matter)
  ```
- **Solution**:
  - **Duplicate Detection**: New `server/utils/duplicate-detector.ts` with email-based duplicate detection
    - `buildEmailIndex()` - Builds email→personId index from people table at start of contacts phase
    - `checkForDuplicates()` - Checks each contact against the index before transform
    - Returns match info with confidence score (100 for exact email match)
  - **Critical Fix**: When duplicate found, add to `peopleLookupCache` with **existing person's ID**
    ```typescript
    peopleLookupCache.set(record.id, duplicateCheck.bestMatch.existingPersonId)
    ```
  - **Duplicate Tracking**: New `import_duplicates` table logs all detected duplicates for review
    - Source record info (externalId, entityType, sourceData JSON)
    - Match info (duplicateType, matchingField, matchingValue, confidenceScore)
    - Resolution tracking (LINKED, CREATED_NEW, SKIPPED, PENDING)
  - **Real-time Index Update**: Newly created contacts added to email index to catch duplicates within same batch
- **Files Created**:
  - `server/utils/duplicate-detector.ts` - Duplicate detection utilities
- **Files Modified**:
  - `server/db/schema.ts` - Added `importDuplicates` table
  - `server/queue/lawmatics-import.ts` - Integrated duplicate detection in contacts phase
  - `server/api/admin/migrations/[id].get.ts` - Added `duplicatesLinked` count to response
  - `app/components/admin/MigrationProgress.vue` - Shows duplicates linked count (amber stat box)
  - `app/pages/settings/integrations/lawmatics/migrate.vue` - Updated interface for duplicatesLinked
- **Key Insight**: "By adding the duplicate to the lookup cache with the existing person's ID, all downstream prospects and notes will resolve correctly instead of failing"
- **Migration**: `0013_dizzy_maverick.sql` - Creates `import_duplicates` table
- **Future Enhancements** (not in this version):
  - Full duplicates list endpoint (`GET /api/admin/migrations/[id]/duplicates`)
  - Manual resolution endpoint (`POST .../duplicates/[id]/resolve`)
  - Review modal with side-by-side comparison

#### Lawmatics Import Fix - Prospects Processing (2026-01-24)
- **Status**: Complete ✅
- **What**: Fixed issue where all prospects/matters failed to import with "Could not resolve client for prospect" error
- **Root Cause**: Contacts were imported into the `people` table (correct per Belly Button Principle), but prospects processing was looking up clients in the `users` table, which was empty
- **Solution**:
  - Added `buildPersonToUserMap()` function to map personId → userId for existing user accounts
  - Added `ensurePersonIsClient()` function that:
    - Looks up person in people table
    - Creates `users` record with role='CLIENT' if not exists
    - Creates `clients` record if not exists
    - Returns userId for matter's clientId FK reference
  - Updated prospects processing to use peopleLookup + ensurePersonIsClient
  - Cache personToUserMap entries so multiple matters for same client reuse the same user
- **Files Modified**:
  - `server/queue/lawmatics-import.ts` - Added new helper functions and updated prospects case
- **Tests Created**:
  - `tests/unit/lawmatics-import-prospects.test.ts` - 22 regression tests covering:
    - Contact to Person to Client flow
    - Multiple matters for same client (key regression scenario)
    - Error handling for orphan prospects
    - Import metadata generation
    - buildPersonToUserMap logic
    - ensurePersonIsClient logic
    - Prospects phase processing integration
- **Key Insight**: "By definition, a person who has a matter associated with them is a client" - so we look up contacts in people table, then promote them to client/user when they have a prospect

#### Server-Side Pagination for Index Endpoints (2026-01-24)
- **Status**: Complete ✅
- **What**: Added server-side pagination to index endpoints and UiDataTable component
- **Design Decisions**:
  - Page-based pagination (not offset-based) - better UX for table navigation
  - Default page size: 25 items
  - Max page size: 100 items (enforced server-side)
  - Server-side sorting applied before pagination
  - Backward compatible - endpoints without pagination params return all data
- **Files Created**:
  - `server/utils/pagination.ts` - Backend pagination helpers (`parsePaginationParams`, `buildPaginationMeta`, `calculateOffset`, `isPaginationRequested`)
  - `app/composables/usePaginatedData.ts` - Frontend composable for paginated data fetching
  - `tests/unit/pagination.test.ts` - Unit tests for pagination utilities (19 tests)
- **Files Modified**:
  - `app/components/ui/DataTable.vue` - Added pagination UI (page info, size selector, prev/next buttons)
  - `server/api/clients/index.get.ts` - Added pagination support
  - `server/api/people/index.get.ts` - Added pagination support
  - `server/api/matters/index.get.ts` - Added pagination support
  - `server/api/referral-partners/index.get.ts` - Added pagination support
  - `app/pages/clients/index.vue` - Connected pagination to DataTable
  - `app/pages/people/index.vue` - Connected pagination to DataTable
  - `app/pages/matters/index.vue` - Connected pagination to custom table
- **Query Parameters**:
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 25, max: 100)
  - `sortBy` - Column to sort by
  - `sortDirection` - 'asc' or 'desc'
- **Response Format**:
  ```typescript
  {
    clients: [...],
    pagination: {
      page: 1,
      limit: 25,
      totalCount: 150,
      totalPages: 6,
      hasNextPage: true,
      hasPrevPage: false
    }
  }
  ```

#### UiDataTable Component & Clients Page Migration (2026-01-23)
- **Status**: Complete ✅
- **What**: Created reusable data table component and migrated clients page
- **Component**: `/app/components/ui/DataTable.vue`
  - Sortable columns
  - Row click handling
  - Customizable slots for cell content
  - Loading and empty states
- **Files Modified**:
  - `app/pages/clients/[id].vue` - Uses new DataTable component
  - `app/pages/matters/[id].vue` - Uses new DataTable component

#### Activity Attribution System Enhancement (2026-01-23)
- **Status**: Complete ✅
- **What**: Redesigned activity logging to provide structured, linkable entity references
- **Key Features**:
  - **EntityRef pattern**: Standardized `{ type, id, name }` references for all entities
  - **Historical accuracy**: Name snapshots at log time preserved
  - **Current name resolution**: API can resolve current names for display
  - **Clickable entity badges**: Activity log shows linked badges to referenced entities
- **New Utilities Created**:
  - `server/utils/entity-resolver.ts` - Centralized entity name resolution
  - `server/utils/activity-description.ts` - Human-readable description generation
- **Files Modified**:
  - `server/utils/activity-logger.ts` - Added EntityRef types, structured logging
  - `server/api/dashboard/activity.get.ts` - Added `resolveNames=true` parameter
  - `app/pages/activity.vue` - Entity badges with links
  - `app/components/dashboard/ActivityFeed.vue` - Entity badges with links
  - 14 API endpoints updated to use structured entity references
- **Documentation**: See CLAUDE.md "Activity Logging System" section

#### Google Drive Integration, Toast Notifications & Notices System (2026-01-21)
- **Status**: Complete ✅
- **What**: Comprehensive Google Drive folder sync, toast notification system, and in-app notices for user alerts

**Phase 1: Toast Notification System**
- **Library**: vue-toastification@next
- **Features**:
  - Position: top-right, stacks up to 5 toasts
  - Auto-dismiss: 5s for info/success, 8s for errors
  - Draggable to dismiss
  - Custom Tailwind-themed styling
- **Files Created**:
  - `/app/plugins/toast.client.ts` - Toast plugin initialization (client-only)
  - `/app/composables/useToast.ts` - Composable with `success()`, `error()`, `warning()`, `info()`, `dismiss()` methods
  - `/app/assets/css/toast.css` - Custom Tailwind theme overrides
- **Usage**:
  ```typescript
  const toast = useToast()
  toast.success('Operation completed')
  toast.error('Something went wrong')
  ```

**Phase 2: Google Drive Status Indicators**
- **Components Created**:
  - `/app/components/drive/StatusBadge.vue` - Compact badge (SYNCED/NOT_SYNCED/ERROR) with folder link
  - `/app/components/drive/StatusSection.vue` - Full status card with folder link, last sync time, error display, resync buttons
- **Integration Points**:
  - Client detail page (`/clients/[id]`) - Badge in header, section after Quick Stats
  - Matter detail page (`/matters/[id]`) - Badge in header, section in Overview tab
- **Resync Features**:
  - "Sync Now" / "Verify Folder" button - Creates folder or verifies existing
  - "Force New Folder" button - Clears old reference and creates new folder in current drive
  - Handles drive configuration changes gracefully (detects inaccessible folders)

**Phase 3: Google Drive Backend & Sync**
- **Database Schema** (in `clientProfiles` and `matters` tables):
  - `googleDriveFolderId` - Drive folder ID
  - `googleDriveFolderUrl` - Web link to folder
  - `googleDriveSyncStatus` - 'SYNCED' | 'NOT_SYNCED' | 'ERROR'
  - `googleDriveSyncError` - Error message if sync failed
  - `googleDriveLastSyncAt` - Timestamp of last sync
  - `googleDriveSubfolderIds` - JSON object of subfolder IDs (matters only)
- **Settings Page**: `/app/pages/settings/google-drive.vue`
  - Service account email and private key configuration
  - Shared Drive ID selection (with "Use this" helper from test results)
  - Root folder name and impersonation email (optional)
  - Matter subfolder names (configurable list)
  - Sync toggles for generated docs, client uploads, signed documents
  - Connection test with diagnostic output (lists accessible drives)
  - Root folder creation button
- **API Endpoints Created**:
  - `GET /api/admin/google-drive/config` - Get current configuration
  - `POST /api/admin/google-drive/configure` - Save configuration
  - `POST /api/admin/google-drive/test` - Test connection (returns accessible drives)
  - `POST /api/admin/google-drive/create-root-folder` - Create root folder in shared drive
  - `POST /api/google-drive/sync/client/[id]` - Sync client folder (with `?force=true` option)
  - `POST /api/google-drive/sync/matter/[id]` - Sync matter folder (with `?force=true` option)
  - `POST /api/google-drive/sync/document/[id]` - Sync document to Drive
- **Utility**: `/server/utils/google-drive.ts`
  - JWT-based service account authentication (Web Crypto API compatible with Workers)
  - `isDriveEnabled()` - Check if Drive is configured
  - `createClientFolder()` - Create/get client folder
  - `createMatterFolder()` - Create matter folder with subfolders
  - `getFile()` - Verify file/folder accessibility
  - `testDriveConnection()` - Test with diagnostic info
  - `syncDocumentToDrive()` - Sync document to appropriate subfolder
  - `syncUploadToDrive()` - Sync client upload to Drive
- **Auto-Create Client Folder**: When creating a matter, if client doesn't have a Drive folder (or it's inaccessible), automatically creates one before creating the matter folder

**Phase 4: Notices System**
- **Database Schema**:
  - `notices` table - Type, severity, title, message, target entity, action URL
  - `noticeRecipients` table - User/role targeting, read/dismiss tracking
- **Notice Types**: DRIVE_SYNC_ERROR, DOCUMENT_SIGNED, CLIENT_FILE_UPLOADED, JOURNEY_ACTION_REQUIRED, SYSTEM_ANNOUNCEMENT, PAYMENT_RECEIVED
- **Severities**: INFO, WARNING, ERROR, SUCCESS
- **API Endpoints**:
  - `GET /api/notices` - Get notices for current user (own + role-broadcast)
  - `GET /api/notices/unread-count` - Get unread count for badge
  - `POST /api/notices/[id]/read` - Mark as read
  - `POST /api/notices/[id]/dismiss` - Dismiss notice
  - `POST /api/notices/mark-all-read` - Mark all as read
- **Utility**: `/server/utils/notice-service.ts`
  - `createNotice()` - Create notice with recipients
  - `notifyDriveSyncError()` - Convenience function for Drive errors
- **UI Components**:
  - `/app/components/notices/NotificationBell.vue` - Bell icon with unread count badge
  - `/app/components/notices/NotificationDropdown.vue` - Dropdown showing recent notices
  - `/app/components/notices/NotificationItem.vue` - Individual notice display
  - `/app/pages/notifications/index.vue` - Full notification history page
- **Composable**: `/app/composables/useNotices.ts` - State management with 60-second polling
- **Integration**: Notification bell added to dashboard header (before user menu)

**Phase 5: Lucide Icons Plugin & Google Drive Icon**
- **Plugin**: `/app/plugins/lucide-icons.ts` - Global Lucide icon registration
- **Custom Icon**: `/app/components/icons/GoogleDrive.vue` - Official multi-color Google Drive logo
- **Icon Usage** (official Google Drive icon appears in):
  - Sidebar navigation (Settings → Google Drive)
  - Settings index page card
  - Google Drive settings page header
  - Drive StatusSection header
  - "Open in Drive" links throughout app

**Files Modified**:
- `/server/db/schema.ts` - Added notices tables, Drive fields to clientProfiles/matters
- `/server/api/clients/[id].get.ts` - Returns Google Drive fields in profile
- `/server/api/matters/index.post.ts` - Auto-creates client folder if missing, creates matter folder
- `/server/api/matters/lawyers.get.ts` - Fixed missing await, added camelCase fields
- `/app/layouts/dashboard.vue` - Added notification bell, Google Drive icon in nav
- `/app/pages/settings/index.vue` - Google Drive icon on settings card
- `/app/pages/matters/index.vue` - Drive status alert with icon
- `nuxt.config.ts` - Added toast CSS import

**Environment Variables**:
- Service account credentials stored in database (not env vars) for easier admin management

**Migration Required**: Run `npx drizzle-kit generate` then `npx drizzle-kit migrate`

---

#### Journey-to-Catalog Many-to-Many Relationship (2026-01-21)
- **Status**: Complete ✅
- **What**: Changed engagement journeys from one-to-one to many-to-many relationship with service catalog items
- **Why**: A single engagement journey process can lead to multiple possible service products - client chooses the service at the end
- **Schema Changes**:
  - **Created**: `journeys_to_catalog` junction table with (journeyId, catalogId) composite primary key
  - **Removed**: `serviceCatalogId` column from `journeys` table
  - **Added**: `selectedCatalogId` column to `clientJourneys` table (tracks client's service selection at journey completion)
- **API Endpoints Updated**:
  - `POST /api/journeys` - Accepts `catalogIds` array (or legacy `serviceCatalogId`)
  - `GET /api/journeys` - Returns `catalog_items` array instead of single service
  - `GET /api/journeys/[id]` - Returns `catalog_items` array with id, name, category, price
  - `PUT /api/journeys/[id]` - Accepts `catalogIds` array, manages junction table
  - `GET /api/client-journeys/client/[clientId]` - Includes `selected_catalog_id` in response
  - `POST /api/client-journeys/[id]/advance` - Uses junction table to find service journeys
  - `POST /api/admin/seed-wydapt` - Uses junction table for journey-catalog linking
  - `POST /api/admin/cleanup-wydapt` - Uses junction table for cleanup queries
- **Files Modified**:
  - `server/db/schema.ts` - New junction table, removed column, added column
  - `server/api/journeys/index.post.ts`
  - `server/api/journeys/index.get.ts`
  - `server/api/journeys/[id].get.ts`
  - `server/api/journeys/[id].put.ts`
  - `server/api/client-journeys/client/[clientId].get.ts`
  - `server/api/client-journeys/[id]/advance.post.ts`
  - `server/api/admin/seed-wydapt.post.ts`
  - `server/api/admin/cleanup-wydapt.post.ts`
- **Migration Required**: Run `npx drizzle-kit generate` then `npx drizzle-kit migrate`

#### E-Signature Integration Phase 3 Complete (2026-01-11)
- **Status**: Complete ✅
- **What**: Completed Phase 3 of e-signature integration - Attorney workflow with email notifications, signatures dashboard, and reminder/revoke functionality
- **Key Achievements**:
  - **Resend Email Integration**: Transactional emails via Resend API for signature requests and reminders
  - **Signatures Dashboard**: New `/signatures` page with status summary cards, filterable table, and action buttons
  - **Reminder System**: Send reminder emails with optional expiration extension
  - **Revoke Functionality**: Attorneys can revoke pending signature sessions
  - **Signed PDF Download**: Public download endpoint for signed documents via signing token
  - **CSS Layout Fix**: Fixed flexbox overflow issue on /clients page with `min-w-0`
- **API Endpoints Created**:
  - `GET /api/signature-sessions` - List sessions with filtering by status, counts for dashboard
  - `POST /api/signature-sessions/[id]/resend` - Send reminder, extend expiration
  - `POST /api/signature-sessions/[id]/revoke` - Revoke pending sessions
  - `GET /api/signature/[token]/download` - Public download for signed PDFs
- **Files Created**:
  - `server/utils/email.ts` - Resend email utility with templates
  - `server/api/signature-sessions/index.get.ts`
  - `server/api/signature-sessions/[id]/resend.post.ts`
  - `server/api/signature-sessions/[id]/revoke.post.ts`
  - `server/api/signature/[token]/download.get.ts`
  - `app/pages/signatures.vue` - Full dashboard with modals
- **Files Modified**:
  - `app/layouts/dashboard.vue` - Added E-Signatures nav item, fixed CSS overflow
  - `app/pages/documents/[id].vue` - Email checkbox/message in signature modal
  - `server/api/documents/[id]/signature-session.post.ts` - Email integration
  - `app/components/signature/SigningCeremony.vue` - Download button on completion
- **Environment Variables**:
  - `RESEND_API_KEY` - Resend API key (required for email)
  - `NUXT_EMAIL_FROM` - From address for emails
- **Phase Status**:
  - ✅ Phase 1: Signature session infrastructure
  - ✅ Phase 2: Standard signature UI
  - ✅ Phase 3: Attorney workflow integration
  - ⏳ Phase 4: Enhanced signature (KYC integration) - Future
  - ⏳ Phase 5: ESIGN action item integration - Future

#### RBAC Testing Infrastructure & Page Restructuring (2026-01-10)
- **Status**: Complete ✅
- **What**: Comprehensive access control testing and flat page structure
- **Key Achievements**:
  - **Centralized Route Configuration**: Created `shared/routes.ts` as single source of truth for all routes and access requirements
  - **Expanded E2E Auth Tests**: From 2 protected route tests to 46 comprehensive tests covering all routes
  - **RBAC E2E Tests**: New test file for role-based access control scenarios
  - **Route Unit Tests**: 61 tests covering route configuration and access control helpers
  - **Page Restructuring**: Moved all pages from `/app/pages/dashboard/` to flat structure at `/app/pages/`
- **Test Coverage**:
  - All 18 protected routes tested for unauthenticated redirect
  - All API endpoint categories tested (firm, admin, client)
  - Cross-role access matrix tests
  - Sensitive data protection tests
  - Client data isolation tests
- **Files Created**:
  - `shared/routes.ts` - Route configuration with access requirements
  - `tests/e2e/rbac.spec.ts` - Role-based access control E2E tests
  - `tests/unit/routes.test.ts` - Route configuration unit tests
- **Files Modified**:
  - `tests/e2e/auth.spec.ts` - Expanded from 10 to 46 tests
  - All pages moved from `app/pages/dashboard/` to `app/pages/`
  - `app/layouts/dashboard.vue` - Updated navigation paths
- **Why**: Attorney-client privilege requires comprehensive access control verification

#### Semgrep Security Fixes & UI Restructuring Completion (2026-01-10)
- **Status**: Complete ✅
- **What**: Fixed Semgrep security findings, completed UI restructuring plan, added journey automation
- **Key Achievements**:
  - **Semgrep XSS Fixes**: Fixed 2 `v-html` XSS vulnerabilities using DOMPurify
  - **Created `useSanitizedHtml` composable**: Reusable XSS protection for v-html rendering
  - **Journey Automation**: Auto-start service journeys when engagement journey completes
  - **Matter List Filters**: Added search, status filter, and client filter to matter list
  - **Secure My-Matters API**: Created `/api/my-matters` endpoint for client-only access
  - **Suppressed test stderr**: Cleaned up noisy error output in template-renderer tests
- **Files Created**:
  - `app/composables/useSanitizedHtml.ts` - Reusable DOMPurify composable
  - `server/api/my-matters/index.get.ts` - Secure client matters endpoint
- **Files Modified**:
  - `server/api/client-journeys/[id]/advance.post.ts` - Auto-start service journeys
  - `app/pages/matters/index.vue` - Added filters/search
  - `app/pages/my-matters/index.vue` - Uses secure endpoint
  - `app/pages/documents/[id].vue` - Uses useSanitizedHtml
  - `app/pages/templates/index.vue` - Uses useSanitizedHtml
  - `tests/unit/template-renderer.test.ts` - Suppressed console.error in error tests
- **UI Restructuring Plan**: Marked as COMPLETED (all phases done)

#### Comprehensive Seed Data & Auto-Seeding (2026-01-10)
- **Status**: Complete ✅
- **What**: Enhanced seed data with real DOCX content and automatic seeding on empty database
- **Key Features**:
  - **Auto-seeding**: Dev server automatically seeds on first request if database is empty
  - **Real DOCX content**: Templates and documents use actual DOCX files from `doc/word_document_templates/`
  - **Document blobs**: Both templates and documents now have DOCX files stored in R2 blob storage
  - **Rendered HTML**: Documents contain properly rendered HTML with variables substituted
  - **8 test accounts**: All roles covered (ADMIN, LAWYER, STAFF, ADVISOR, CLIENT)
  - **Comprehensive relationships**: People, client relationships, matter relationships
- **Seed Data Includes**:
  - 8 users (all roles)
  - 3 client profiles
  - 3 matters (OPEN, PENDING, CLOSED)
  - 2 matter-service engagements
  - 1 journey template with 7 steps
  - 3 client journeys (IN_PROGRESS, COMPLETED, NOT_STARTED)
  - 14 journey step progress records
  - 11 action items
  - 5 people records
  - 4 client relationships
  - 4 matter relationships
  - 4 documents with DOCX blobs
  - 3 document templates with DOCX blobs
- **New Utility**: `server/utils/template-upload.ts` - Reusable DOCX processing for uploads and seeding
- **Files Created/Modified**:
  - `server/db/seed.ts` - Enhanced with real DOCX content
  - `server/plugins/database.ts` - Auto-seeding on first request
  - `server/utils/template-upload.ts` - New reusable utility
  - `server/api/_dev/seed.post.ts` - Updated response with all test accounts
- **Migration**: `0059_rename_counsel_to_attorney.sql` - Fixed column naming mismatch

#### hubBlob() Deprecation Fix (2026-01-10)
- **Status**: Complete ✅
- **What**: Updated all files using deprecated `hubBlob()` to use auto-imported `blob` from `hub:blob`
- **Files Updated**:
  - `server/api/document-uploads/index.post.ts`
  - `server/api/templates/upload.post.ts`
  - `server/api/_dev/seed.post.ts`
  - `server/queue/document-processor.ts`
  - `server/api/admin/seed-wydapt.post.ts`
  - `server/api/admin/upload-seed-documents.post.ts`
- **Note**: `blob` is now auto-imported from `hub:blob` module in NuxtHub 0.10.x

#### Role Structure Clarification (2026-01-09)
- **Status**: Complete ✅
- **What**: Clarified and fixed the distinction between STAFF and ADVISOR roles
- **Key Distinction**:
  - **STAFF**: Internal firm employees (paralegals, legal secretaries, receptionists) with broad access to all clients/matters
  - **ADVISOR**: External third-parties (CPAs, investment advisors, insurance brokers) with LIMITED access to specific clients/matters they're assigned to
- **Changes Made**:
  - Added 'STAFF' to user role enum in schema
  - Updated `FIRM_ROLES = ['ADMIN', 'LAWYER', 'STAFF']` throughout (was incorrectly using ADVISOR)
  - RBAC utilities updated: `isFirmMember()` now includes STAFF, `canAccessClient()` excludes ADVISOR
  - Navigation shows firm-level items to STAFF (same as LAWYER)
  - User management UI allows setting admin levels for STAFF (not ADVISOR)
  - Profile page calendar management available to STAFF
  - Tests updated for STAFF role access patterns
- **Files Modified**:
  - `server/db/schema.ts` - Added STAFF to role enum
  - `server/utils/rbac.ts` - Added `isFirmMember()`, updated role checks
  - `server/api/users/index.post.ts` - STAFF in enum, FIRM_ROLES logic
  - `server/api/users/[id].put.ts` - STAFF in enum, FIRM_ROLES logic
  - `server/api/referral-partners/*.ts` - Added STAFF to allowed roles
  - `app/layouts/dashboard.vue` - FIRM_ROLES navigation
  - `app/pages/settings/users.vue` - STAFF option, FIRM_ROLES logic
  - `app/pages/profile/index.vue` - isFirmMember for calendar access
  - `tests/unit/rbac.test.ts` - STAFF role tests
- **Note**: Many API endpoints still use `['LAWYER', 'ADMIN']` - STAFF access can be added as needed

#### Activity Logging & Request Context System (2026-01-09)
- **Status**: Complete ✅
- **What**: Comprehensive activity logging system with request context capture and analytics dimensions
- **Implementation**:
  - Enhanced `activities` table with funnel/attribution dimensions
  - Added `referralPartners`, `marketingEvents`, `eventRegistrations` tables
  - Added referral tracking fields to `clientProfiles`
  - Created `server/utils/request-context.ts` - Captures IP, user agent, geo from Cloudflare headers
  - Created `server/utils/activity-logger.ts` - Structured logging utility
  - Activity log page at `/activity` with filtering and CSV export
  - Wired logging into login, client creation, document signing, document generation
- **Files Created**:
  - `server/utils/request-context.ts`
  - `server/utils/activity-logger.ts`
  - `server/api/referral-partners/index.get.ts`, `index.post.ts`, `[id].put.ts`
  - `app/components/dashboard/ActivityFeed.vue`
  - `app/pages/activity.vue`
- **Migration**: `0024_large_gertrude_yorkes.sql`

#### Firebase Authentication with OAuth Providers (2026-01-08)
- **Status**: Complete and working ✅
- **What**: Integrated Firebase Authentication to support OAuth providers (Google, Microsoft, Apple, Facebook) alongside existing email/password authentication
- **Implementation**:
  - Enabled `oauthProviders` table and `firebaseUid` field in database schema
  - Created migration `0056_firebase_oauth.sql` for OAuth providers table
  - Created migration `0057_make_password_nullable.sql` for OAuth-only users
  - Installed `firebase` and `firebase-admin` packages
  - Built client-side Firebase plugin and auth composable
  - Server-side token verification with automatic user creation/linking
  - Admin UI for managing OAuth providers at `/settings/oauth-providers`
  - Role-based navigation refactored for better configurability
- **Key Features**:
  - Automatic account linking by email (OAuth login links to existing email/password account)
  - Support for both popup and redirect auth flows (falls back to redirect if popup blocked)
  - OAuth-only users can sign up without password
  - Profile page hides "Change Password" section for OAuth-only users
  - Provider logos stored locally (`/public/icons/google.svg`, etc.)
- **Files Created/Modified**:
  - `/server/db/schema.ts` - Enabled oauthProviders table, firebaseUid field
  - `/nuxt.config.ts` - Added Firebase runtime config
  - `/app/plugins/firebase.client.ts` - Firebase client initialization (NEW)
  - `/app/composables/useFirebaseAuth.ts` - OAuth flow composable (NEW)
  - `/server/api/auth/firebase.post.ts` - Token verification endpoint (NEW)
  - `/server/utils/firebase-admin.ts` - Firebase Admin SDK utility (NEW)
  - `/server/middleware/auth.ts` - Added public routes for Firebase auth
  - `/app/pages/login.vue` - Added OAuth buttons, wrapped in ClientOnly for hydration
  - `/app/layouts/dashboard.vue` - Role-based navigation configuration
  - `/app/pages/profile/index.vue` - Conditional password section
  - `/server/api/auth/session.get.ts` - Added hasPassword/hasFirebaseAuth flags
  - `/public/icons/*.svg` - Provider logos (google, microsoft, facebook, apple)
- **Environment Variables Required**:
  - `NUXT_PUBLIC_FIREBASE_API_KEY` - Firebase client API key
  - `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
  - `NUXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
  - `NUXT_FIREBASE_SERVICE_ACCOUNT` - Firebase Admin service account JSON
- **Note**: Firebase must be configured in Firebase Console with desired OAuth providers enabled

#### Multiple Middle Names Support (2026-01-06)
- **Status**: Complete and working
- **What**: Added support for variable-length middle names arrays to People table
- **Implementation**:
  - Created migration `0052_add_middle_names_to_people.sql`
  - Built Drizzle custom `jsonArray` type for automatic JSON serialization/deserialization
  - Converted all 5 People API endpoints from `hubDatabase()` to Drizzle ORM
  - Progressive disclosure UI: simple single input by default, expandable to multiple inputs
  - Navigation menu item added for People page
- **Files Modified**:
  - `/server/database/schema.ts` - Custom jsonArray type + People table definitions
  - `/server/api/people/*.ts` - All 5 endpoints (POST, PUT, GET, GET by ID, DELETE)
  - `/app/pages/people/index.vue` - Progressive disclosure UI
  - `/app/layouts/dashboard.vue` - Added People menu item
- **Pattern Established**: ORM-layer serialization via Drizzle custom types (reusable for other JSON data)

#### Action Items & Task Management System (2026-01-06)
- **Status**: Complete and working ✅
- **What**: Comprehensive task management system integrated into journey builder with "ring the bell" philosophy
- **Implementation**:
  - Created migration `0053_enhance_action_items_and_journey_steps.sql`
  - Extended action types: 14 types total including AUTOMATION, THIRD_PARTY, OFFLINE_TASK, EXPENSE, FORM, DRAFT_DOCUMENT
  - Added system integration tracking (calendar, payment, document, manual)
  - Implemented "ring the bell" service delivery verification fields
  - Enhanced journey steps with final step verification
  - Converted 6 action-items API endpoints to Drizzle ORM
  - Built complete UI with action type selector and configuration modals
- **Key Features**:
  - Every journey step must have ≥1 action item (enforced with validation)
  - Visual action type selector with 14 types (icons + descriptions)
  - Type-specific configuration forms (Meeting, Upload, Payment, E-Signature, Draft Document, Questionnaire)
  - System integration toggles for calendar/payment/document features
  - Service delivery verification with objective criteria and evidence
  - Real-time validation warnings showing steps without action items
  - Expandable action items sections within each journey step
- **Action Types Available**:
  - QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY
  - PAYMENT, MEETING, KYC
  - AUTOMATION, THIRD_PARTY, OFFLINE_TASK
  - EXPENSE, FORM, DRAFT_DOCUMENT
- **Files Created/Modified**:
  - `/server/database/migrations/0053_enhance_action_items_and_journey_steps.sql`
  - `/server/database/schema.ts` - Enhanced actionItems and journeySteps tables
  - `/server/api/action-items/*.ts` - 6 endpoints (POST, PUT, DELETE, GET by step, GET by journey, complete)
  - `/server/api/journeys/[id]/validate.get.ts` - Journey validation endpoint
  - `/app/components/journey/ActionItemModal.vue` - Action item configuration modal (NEW)
  - `/app/pages/journeys/[id].vue` - Enhanced with action items display and validation
- **Plan Document**: `/doc/action-items-task-management-plan.md` (comprehensive)
- **Draft Document Action Type**: Stubbed with integration hooks for future document generation system
  - Configuration: document name, template ID, drafting notes
  - Integration toggle for document system
  - Blue info banner indicating future integration

#### Currency Formatting Refactored (2026-01-06)
- **Status**: Complete
- **What**: Consolidated all price formatting into centralized utility
- **Implementation**:
  - Created `formatCurrency()` in `/app/utils/format.ts`
  - Correctly converts cents → dollars (divides by 100)
  - Refactored 7 components to use centralized utility
  - Fixed bugs in ServicesTable and PaymentsTable (were missing /100 division)
- **Files Modified**:
  - `/app/utils/format.ts` - Added formatCurrency function
  - `/app/components/matter/ServicesTable.vue` - Bug fixed
  - `/app/components/matter/PaymentsTable.vue` - Bug fixed
  - `/app/pages/service-catalog/index.vue`
  - `/app/pages/matters/index.vue`
  - `/app/pages/matters/[id].vue`
  - `/app/pages/matters/index.vue`

#### Matters API Route Structure Fixed (2026-01-06)
- **Status**: Complete
- **What**: Fixed route conflicts caused by inconsistent parameter naming
- **Problem**: Both `[id]` and `[matterId]` directories causing 404 errors
- **Solution**: Consolidated to `[id]` with consistent parameter names
- **Files Modified**:
  - Moved `/api/matters/[matterId]/relationships/` → `/api/matters/[id]/relationships/`
  - Renamed relationship endpoints to use `[relationshipId]` instead of nested `[id]`
  - Updated all `getRouterParam` calls for consistency

#### Edit Matter Functionality Added (2026-01-06)
- **Status**: Complete
- **What**: Added edit functionality to matter detail page
- **Why**: Users needed ability to change matter status (PENDING → OPEN) from detail view
- **Implementation**:
  - Added "Edit Matter" button to matter detail page header
  - Created modal with fields: title, description, status, contract date
  - Status dropdown: PENDING, OPEN, CLOSED
  - Auto-populates form with current matter data
  - Saves changes and refreshes matter view
- **Files Modified**:
  - `/app/pages/matters/[id].vue` - Added edit modal and handler

### Currently In Progress 🔄

#### Entity Notes System (2026-01-23)
- **Status**: In Progress 🔄
- **What**: Polymorphic notes system allowing notes to be attached to any entity type
- **Supported Entity Types**: client, matter, document, appointment, journey
- **Components**:
  - `app/components/EntityNotes.vue` - Reusable notes component (NEW)
- **API Endpoints**:
  - `POST /api/notes` - Create note for any entity type
  - `PUT /api/notes/[id]` - Update note (creator or admin only)
  - `DELETE /api/notes/[id]` - Delete note (creator or admin only)
  - `GET /api/clients/[id]/notes` - Get notes for a client
  - `POST /api/clients/[id]/notes` - Create note for a client (legacy endpoint)
- **Database**: `notes` table with `entityType` and `entityId` columns
- **Integration Points**:
  - Client detail page (`/clients/[id]`) - Notes tab
  - Matter detail page (`/matters/[id]`) - Notes section
- **Migration**: `0008_wide_venom.sql`

#### NuxtHub 0.10.x Upgrade & API Response Normalization (2026-01-07)
- **Status**: Core migration complete ✅ - Remaining endpoints on-demand
- **What**: Upgraded from NuxtHub 0.9.x to 0.10.x with full API changes, plus systematic conversion of API responses to snake_case
- **Migration Documentation**: `/doc/NUXTHUB_010_API_MIGRATION.md` (comprehensive reference)

**Completed**:
- ✅ Configuration updated: `database: true` → `db: 'sqlite'`
- ✅ Directory moved: `server/database/` → `server/db/` (with git history)
- ✅ All database access converted from `hubDatabase()` to `import { db } from 'hub:db'`
- ✅ **All blob API calls updated**: `hubBlob()` → `import { blob } from 'hub:blob'` (5 files)
  - documents/[id]/download.get.ts - Document downloads now working
  - documents/generate-from-template.post.ts - Document generation
  - documents/[id]/variables.post.ts - Variable updates with DOCX regeneration
  - documents/upload.post.ts - Document uploads
  - document-uploads/[id]/download.get.ts - Upload downloads
- ✅ Database initialization working with NuxtHub 0.10.x virtual modules
- ✅ Schema synchronized with migrations (removed deprecated `isTemplate` field)
- ✅ Fixed journey step enum mismatch (`ATTORNEY` → `COUNSEL`)
- ✅ **Fixed document download bug**: Documents now generate proper blob keys when regenerated
- ✅ **26 API endpoints converted to snake_case** with proper timestamp handling:
  - Matters: index, detail, lawyers dropdown, relationships
  - Clients: index, detail, matters, relationships
  - Journeys: index, detail, engagement templates, progress
  - Action Items: by step, by client journey
  - Templates: index, detail
  - Service Catalog: index
  - People: index, detail
  - Users: index
  - Documents: detail
  - Dashboard: stats, activity
  - Appointments: index
  - Client Journeys: by client, by matter, progress

**Remaining Work** (On-Demand Approach):
- ~70 remaining GET endpoints to convert as features are tested/used
- Update KV and Cache API calls when encountered (utilities, queue handlers)
- Pattern established and documented - apply as needed

**Key Bug Fixes**:
1. **Document downloads working** - Fixed blob API calls and blob key generation
2. **DOCX regeneration working** - Generates blob keys for documents that don't have them
3. **Template uploads working** - Blob storage integration functional
4. **All core features tested** - Matters, clients, journeys, templates, documents all displaying correctly

**Files Modified** (Complete List):
- `/server/db/index.ts` - Database initialization with virtual modules
- `/server/db/schema.ts` - Removed deprecated fields, fixed enums
- `/server/api/documents/[id]/download.get.ts` - Blob API + download fix
- `/server/api/documents/generate-from-template.post.ts` - Blob API
- `/server/api/documents/[id]/variables.post.ts` - Blob API + blob key generation fix
- `/server/api/documents/upload.post.ts` - Blob API
- `/server/api/document-uploads/[id]/download.get.ts` - Blob API
- `/server/api/templates/upload.post.ts` - Blob API migration
- `/server/api/{matters,clients,journeys,action-items,etc}/**/*.get.ts` - 26 endpoints with snake_case conversion
- `/doc/NUXTHUB_010_API_MIGRATION.md` - Migration reference guide

#### ~~UI Restructuring Plan: Matter-Centric Architecture~~ ✅ COMPLETED
- **Status**: Complete ✅
- **What Was Done**: Pages moved from `/app/pages/dashboard/` to flat structure at `/app/pages/`
- **Plan File**: `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md`
- **Completed**:
  - ✅ Page restructuring (flat structure)
  - ✅ Matter detail view at `/app/pages/matters/[id].vue`
  - ✅ Navigation updated
  - ✅ Service catalog at `/app/pages/service-catalog/`

---

## 🏗️ Architecture Overview

### Domain Model (Current State)

**Core Entities**:
- **People**: Individuals and entities with contact info, identity fields, and middle names support
- **Clients**: References a Person, tracks engagement status
- **Matters**: Primary unit of engagement (with client), has title, status, description
- **Service Catalog**: Template services (WYDAPT, Maintenance, etc.) with pricing
- **matters_to_services**: Junction table linking engaged services to matters
- **Client Journeys**: Multi-step workflows tied to matters and services
- **Journey Templates**: Reusable workflow definitions
- **Payments**: Tracked at matter level (planned UI implementation)
- **Documents**: Attached to matters (planned UI implementation)

**Key Relationships**:
```
Client (1) ──→ Person (1)
Matter (N) ──→ Client (1)
Matter (N) ←─→ Service Catalog (N) via matters_to_services
Journey (N) ←─→ Service Catalog (N) via journeys_to_catalog
Client Journey (N) ──→ Matter (1)
Client Journey (N) ──→ Journey (1)
Client Journey (1) ──→ Service Catalog (0..1) via selectedCatalogId (for ENGAGEMENT journeys)
Payment (N) ──→ Matter (1)
Document (N) ──→ Matter (1)
```

### Technology Stack

**Backend**:
- Nuxt 4 + NuxtHub (Cloudflare-based)
- Drizzle ORM with custom types
- SQLite (D1) database
- API routes in `/server/api/`

**Frontend**:
- Vue 3 Composition API
- TailwindCSS + custom UI components
- Progressive disclosure patterns for complex forms

**Document Generation**:
- docxtemplater for template rendering (output side)
- Future: Schema extraction architecture (input side - see below)

---

## 🔮 Future Work

### ~~0. SEMGREP Security Scanning~~ ✅ COMPLETED (2026-01-10)
- **Status**: Complete ✅
- Semgrep Cloud Platform integration is active
- Fixed 2 XSS vulnerabilities identified by Semgrep scans
- Created `useSanitizedHtml` composable for reusable XSS protection
- Branch protection can be configured to require Semgrep checks before merge

### ~~1. Development Seed Data Improvements~~ ✅ COMPLETED (2026-01-10)
- **Status**: Complete ✅
- See "Comprehensive Seed Data & Auto-Seeding" in Recently Completed section above
- All requirements met: users, matters, journeys, documents, people, relationships
- Auto-seeding on empty database for zero-config development startup

### 1. Schema Extraction Architecture
- **Status**: Documented, not implemented
- **Doc**: `/doc/future-schema-extraction-architecture.md`
- **Goal**: Extract template schemas from Word documents to auto-generate journey steps
- **Key Insight**: docxtemplater covers ~20% (document generation/output), schema extraction covers ~80% (document analysis/input)
- **Phases**:
  1. Template parsing and field extraction
  2. Domain model mapping (Trust, Person, Relationships)
  3. Human review and refinement UI
  4. Code generation for journey components
  5. Journey template creation
- **Philosophy**: Prefer domain models over custom fields, avoid "swiss army knife" custom field proliferation

### 2. Trust Domain Model
- **Status**: Conceptual discussion, not implemented
- **Goal**: First-class Trust entity with proper relationships
- **Why**: Estate planning specific, can hard-code domain knowledge
- **Fields**: Trust name, type, settlor(s), trustee(s), beneficiaries, formation date, jurisdiction
- **Benefits**: Type-safe journey steps, better data integrity, reduced custom fields

### 3. Payment Management UI (Phase 3)
- **Status**: Database table exists, no UI yet
- **Need**: Record payments, view payment history, calculate balances
- **Location**: Matter detail view (Payments tab)

### ~~4. Toast Notifications & UI Polish~~ ✅ COMPLETED (2026-01-21)
- **Status**: Complete ✅
- **Implementation**: vue-toastification with custom Tailwind styling
- See "Google Drive Integration, Toast Notifications & Notices System" in Recently Completed section
- `useToast()` composable available globally with `success()`, `error()`, `warning()`, `info()` methods
- **Remaining polish** (optional future work):
  - Replace remaining `alert()` calls with toast notifications
  - Improve tooltip styling (currently using native `title` attributes)
  - Audit loading states across the app

### 5. API Token Authentication
- **Status**: Planned
- **Problem**: No programmatic API access - only session-based authentication via UI
- **Why**: Enable external integrations, testing, automation, and third-party service access
- **Use Cases**:
  - Integration with external CRM/practice management systems
  - Automated document generation workflows
  - Third-party client portals
  - Testing and development convenience
  - Zapier/Make.com integrations
- **Scope**:
  - **API key generation**: Allow users to create API keys with optional scopes/permissions
  - **API key management UI**: View, create, revoke, and regenerate keys
  - **Token-based auth middleware**: Validate `Authorization: Bearer <token>` header
  - **Rate limiting**: Protect endpoints from abuse
  - **Audit logging**: Track API usage for security and debugging
  - **API documentation**: OpenAPI/Swagger docs for all endpoints
- **Security Considerations**:
  - Tokens should have scopes (read-only, read-write, admin)
  - Tokens should be revocable
  - Tokens should have expiration dates (optional)
  - Rate limiting per token
  - IP allowlisting (optional)
- **Implementation Notes**:
  - Tokens stored hashed in database (like passwords)
  - Middleware checks both session auth and token auth
  - Existing endpoints work with both auth types
  - New `/api/api-keys/*` endpoints for key management

### 6. API Case Convention Refactor (snake_case → camelCase)
- **Status**: Planned (requires coordinated effort)
- **Problem**: Mixed conventions in API responses due to migration from raw SQL to Drizzle ORM
  - Some endpoints return snake_case (`first_name`, `created_at`)
  - Some return camelCase (`firstName`, `createdAt`)
  - Some return BOTH for backward compatibility
- **Goal**: Standardize all API responses to camelCase
- **Scope**:
  - Audit all API endpoints for response format
  - Update frontend components to use camelCase consistently
  - Remove snake_case fallbacks after frontend migration
- **Why coordinated effort**: Changing API response shapes breaks frontend components expecting the old format
- **Approach**:
  1. Inventory all endpoints with snake_case responses
  2. Update frontend components endpoint-by-endpoint
  3. Remove snake_case from backend after frontend updated
  4. Test each endpoint/component pair before moving to next
- **Documentation**: See CLAUDE.md "Attribute Case Conventions" section for current rules
- **DO NOT** attempt opportunistic cleanup - requires frontend + backend changes together

### 7. Estate Plan Administration Features (Phase 7)
- **Status**: Documented, not implemented
- **Context**: Phases 1-6 of estate plan management are complete (import, display, CRUD, status transitions). Phase 7 covers post-death administration workflows.
- **Goal**: Enable attorneys to manage estate plan administration after grantor death/incapacity
- **Features**:
  - **Status Transition Workflows UI**: Modal/button in plan detail to change status (API exists, needs UI)
  - **Enhanced Distribution Recording**: Add `distributionAmount`, `distributionDescription`, and beneficiary selection to Add Event modal
  - **Add Role Modal**: Replace placeholder with full working modal for adding trustees, beneficiaries, agents, etc.
  - **Create Administration Matter**: Button/flow to create a new matter linked to the plan for administration work (uses `planToMatters` table with `ADMINISTRATION` relationship type)
  - **Auto-Notifications**: Create notices when status changes or key events occur (notices schema exists, needs integration)
- **Backend Status**:
  - ✅ `PUT /api/estate-plans/:id/status` - State machine API ready
  - ✅ `POST /api/estate-plans/:id/events` - Events API with distribution fields in schema
  - ✅ Role CRUD APIs ready
  - ✅ `POST /api/matters` - Matter creation API ready
  - ✅ `planToMatters` table with ADMINISTRATION relationship type
  - ✅ `notices` / `noticeRecipients` tables exist
  - ❌ No API to create notices programmatically
- **Frontend Status**:
  - ❌ No status transition UI (button/modal)
  - ⚠️ Add Event modal lacks distribution amount/beneficiary fields
  - ❌ Add Role modal is placeholder only
  - ❌ No "Create Administration Matter" button
  - ❌ No auto-notification integration
- **Why Deferred**: This is more like an epoch than a sprint - significant UI work across multiple components

### ~~8. Journey-Matter Workflow Fix~~ ✅ COMPLETED (2026-01-10) (was #7)
- **Status**: Complete ✅
- **Implementation**: Auto-start service journeys when engagement journey completes
- When ENGAGEMENT journey completes, automatically creates client journeys for all engaged services
- Backend already validates matter-service engagement before manual journey creation
- See `server/api/client-journeys/[id]/advance.post.ts`

### ~~7. Enhanced Matter List View~~ ✅ COMPLETED (2026-01-10)
- **Status**: Complete ✅
- Added search input (title, matter #, client name)
- Added status filter (All/Open/Pending/Closed)
- Added client filter dropdown
- Added "Clear filters" button
- See `app/pages/matters/index.vue`

### ~~8. Client Experience Improvements~~ ✅ PARTIALLY COMPLETED (2026-01-10)
- **Status**: Security fix complete, card layout deferred
- Created secure `/api/my-matters` endpoint (returns only client's matters)
- Fixed security issue where clients could see all matters
- Card-based layout is optional polish for future

### 9. Client/People Schema Cleanup - Derived vs Stored Booleans
- **Status**: Planned (requires data model review)
- **Problem**: Several boolean fields in the `clients` and `people` schemas store data that can become stale or could be derived from relationships
- **Problematic Fields**:
  - `has_minor_children` - Can be derived from `relationships` table where `relationshipType='CHILD'` and the child person's `dateOfBirth` indicates they're under 18
  - `has_will` / `has_trust` - These are point-in-time snapshots that become stale. Could be derived from `documents` or `estate_plans` tables
- **Why This Matters**:
  - Boolean values stored at intake time become stale as circumstances change
  - If a child turns 18, `has_minor_children` doesn't automatically update
  - If we create a trust document for a client, `has_trust` isn't automatically updated
  - Maintaining these manually is error-prone and creates data inconsistency
- **Proposed Solutions**:
  1. **Derive from relationships**: Query `relationships` + `people.dateOfBirth` to compute `hasMinorChildren` at read time
  2. **Derive from documents/plans**: Query `estate_plans` or `documents` with type='TRUST' to compute `hasTrust`
  3. **Remove booleans entirely**: Replace with computed properties in API responses
  4. **Keep as "initial intake" fields**: Rename to `hadMinorChildrenAtIntake` to clarify they're historical snapshots
- **Migration Considerations**:
  - Need to ensure relationships are created when children are added during intake
  - May need to backfill relationships from existing `childrenInfo` JSON field
  - Frontend intake form should create relationship records, not just set booleans
- **Related**: The `childrenInfo` JSON field should probably become proper `relationships` + `people` records
- **Priority**: Medium - affects data integrity long-term but current implementation works for intake
- **Design Tension - Intake Simplicity vs Data Integrity**:
  - At intake, staff only need to know *whether* there are minor children, not the details
  - Forcing full child entry (name, DOB, relationship record) at intake creates friction
  - But storing only a boolean means the data becomes stale and disconnected from the relationship model
  - **This tension will recur** for other "do you have X?" intake questions (existing trust, business ownership, etc.)
  - **Possible pattern**: Two-phase data capture
    1. **Intake phase**: Capture boolean flags as "signals" for what detailed data will be needed
    2. **Matter/Journey phase**: Journey steps prompt for full details, creating proper relationship records
    3. **Reconciliation**: Once detailed records exist, the boolean becomes redundant (or is computed)
  - **Alternative pattern**: "Quick add" vs "Full add"
    - Boolean flag enables a "quick note" that children exist
    - Later, a dedicated UI collects full child records and clears/replaces the boolean
  - **Key insight**: The boolean isn't wrong at intake - it's the right level of detail for that moment. The problem is treating it as the permanent source of truth rather than a temporary placeholder

### 10. US Address Validation API
- **Status**: Planned
- **Problem**: Address fields are currently free-form text with no validation
- **Goal**: Validate US addresses against USPS database for accuracy and deliverability
- **Use Cases**:
  - Client intake forms - ensure mailing addresses are valid
  - Estate plan documents - proper legal addresses for trusts, property descriptions
  - Notarization workflows - verify signer addresses
  - Marketing/mail campaigns - reduce returned mail
- **Implementation Options**:
  - **USPS Web Tools API** (free, requires registration) - Address standardization and verification
  - **SmartyStreets/Smarty** (paid) - Higher rate limits, better UX, autocomplete
  - **Google Places API** (paid) - Autocomplete with validation
  - **Lob Address Verification** (paid) - Simple API, good for verification-only
- **Scope**:
  - API endpoint to validate/standardize addresses
  - Client-side composable for address input with validation
  - Optional address autocomplete component
  - Store both entered and standardized address versions
- **Database Consideration**: May want to add `addressStandardized` field or expand address to structured format (street1, street2, city, state, zip, plus4)

---

## 📂 Key Documentation Files

### Current & Active
- **THIS FILE** (`CURRENT_STATUS.md`) - Up-to-date project status
- `USAGE.md` - How to run the project
- `API_AUDIT_REPORT.md` - Comprehensive API endpoint documentation
- `action-items-task-management-plan.md` - Action items & task management system (comprehensive)
- `future-schema-extraction-architecture.md` - Future feature planning
- `entity-relationship-diagram.md` - Current database schema
- `domain-model-final.md` - Domain model documentation
- `wydapt-seeding-production.md` - Production seeding instructions
- `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md` - UI restructuring plan (COMPLETED)

### Reference/Historical (Can be archived or consolidated)
- `domain-model-*.md` files (multiple) - Consolidate into `domain-model-final.md`
- `wydapt-*-analysis.md` files - Historical gap analysis, can archive
- `documentation-update-summary.md` - Superseded by this file
- `DOCUMENTATION_CLEANUP_ANALYSIS.md` - Superseded by this cleanup
- `client-detail-page-issues.md` - Will be addressed in Phase 4
- `phase-1-implementation-summary.md` - Historical, can archive

---

## 🚀 Quick Start (For Tomorrow)

### If continuing API normalization work:
1. Run the application and test features
2. If you encounter fields showing as undefined/null in UI:
   - Find the corresponding API endpoint (check browser network tab)
   - Open the endpoint file (e.g., `/server/api/.../something.get.ts`)
   - Look for `.all()` or `.get()` calls on Drizzle queries
   - Add snake_case conversion mapping (see pattern in Technical Decisions Log)
   - Convert Date objects to timestamps: `item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt`
   - Convert booleans to integers: `item.isActive ? 1 : 0`
3. Reference examples:
   - `/server/api/matters/index.get.ts` - Simple list conversion
   - `/server/api/journeys/index.get.ts` - Enriched data with aggregates
   - `/server/api/documents/[id].get.ts` - Complex nested objects
4. **Priority order**: Fix endpoints as UI features are tested/used (on-demand approach)

### ~~If resuming UI restructuring work:~~ ✅ COMPLETED
- UI restructuring plan is complete (all phases done)
- See `/Users/owenhathaway/.claude/plans/lexical-plotting-wadler.md` for summary

### If continuing People/middle names work:
- Feature is complete! No further work needed unless testing reveals issues.

### If starting schema extraction:
1. Review `/doc/future-schema-extraction-architecture.md`
2. Clarify scope: Which phase to start with?
3. Consider building Trust domain model first (provides target for extraction)

---

## 🎯 Custom Fields Philosophy

**Principle**: Thoughtful, tightly integrated custom fields - not swiss army knife proliferation

**Guidelines**:
- UI should scan for existing domain model fields before creating custom fields
- Prefer hard-coded domain models (Trust, Person+Relationships) over generic custom fields
- Estate planning specific → can hard-code domain knowledge
- Schema extraction should suggest domain model mappings, not just create custom fields
- Human review step maps extracted fields → domain models

**Why**: Prevents custom field sprawl, maintains data integrity, enables type-safe journeys

---

## 📊 Technical Decisions Log

### 2026-01-07: API Response Normalization Strategy
- **Decision**: Systematically convert all Drizzle ORM responses to snake_case at API layer
- **Context**: NuxtHub 0.10.x migration + Drizzle ORM adoption revealed field name mismatch
- **Problem**: Drizzle returns camelCase, existing UI expects snake_case from old raw SQL days
- **Solution**: Map all API responses to include both camelCase and snake_case (backwards compatible)
- **Pattern**:
  ```typescript
  return items.map(item => ({
    id: item.id,
    fieldName: item.fieldName, // camelCase for new code
    field_name: item.fieldName, // snake_case for existing UI
    createdAt: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt,
    created_at: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt
  }))
  ```
- **Scope**: All GET endpoints using `.all()` or `.get()` (~96 files identified)
- **Progress**: 26 high-priority endpoints completed, ~70 remaining
- **Rationale**: Gradual migration path, no UI changes required, prevents display bugs

### 2026-01-06: ORM-Layer Serialization
- **Decision**: Move JSON serialization from API layer to ORM layer
- **Implementation**: Drizzle custom types (e.g., `jsonArray`)
- **Benefit**: Cleaner API code, automatic handling, reusable pattern
- **Pattern**: Use for any JSON data in TEXT columns

### 2026-01-06: Progressive Disclosure for Middle Names
- **Decision**: Simple single input by default, expandable to multiple
- **Rationale**: "The vast majority of people have only one middle name, if any" (user quote)
- **Implementation**: Toggle flag + automatic reversion when reducing to 0-1 names
- **Pattern**: Reuse for other rare-but-needed complexity

### Prior: Matter-Centric Domain Model
- **Decision**: Matters are primary unit of engagement (not services)
- **Implementation**: Junction table `matters_to_services`, journeys reference matters
- **Migration**: Complete at database level, UI catch-up in progress

---

## 🐛 Known Issues

1. ~~**No Payment Management UI**~~: ✅ RESOLVED - Full billing & trust accounting system implemented (2026-01-28)

2. **Google Drive E2E Test Failures**: Several Google Drive-related E2E tests are failing due to configuration/mock issues:
   - Tests in `tests/e2e/auth.spec.ts` that involve Google Drive sync status
   - Tests expecting Drive folder creation during matter creation
   - **Root Cause**: E2E tests don't have proper Google Drive API mocking or test credentials configured
   - **Impact**: Low - Google Drive integration works in development/production with proper credentials
   - **TODO**: Add proper E2E test fixtures for Google Drive integration or skip Drive-related assertions in E2E tests

---

## 🗂️ Archive Candidates

The following files can be moved to `/doc/archive/` as they represent historical analysis or are superseded:

- `domain-model-analysis.md` - Superseded by `domain-model-final.md`
- `domain-model-erd.md` - Superseded by `entity-relationship-diagram.md`
- `domain-model-migration-summary.md` - Historical migration doc
- `domain-model-restructuring.md` - Superseded by final model
- `domain-model-ui-impact.md` - Superseded by UI restructuring plan
- `wydapt-corrected-assessment.md` - Historical assessment
- `wydapt-implementation-gap-analysis.md` - Historical gap analysis
- `wydapt-configurability-analysis.md` - Historical analysis
- `documentation-update-summary.md` - Superseded by this file
- `DOCUMENTATION_CLEANUP_ANALYSIS.md` - Superseded by this cleanup
- `phase-1-implementation-summary.md` - Historical implementation summary
- `client-detail-page-issues.md` - Issues documented in UI restructuring plan

**Keep Active**:
- `entity-relationship-diagram.md` - Current schema reference
- `domain-model-final.md` - Current domain model doc
- `future-schema-extraction-architecture.md` - Future planning
- `API_AUDIT_REPORT.md` - API reference
- `USAGE.md` - How-to guide
- `wydapt-seeding-production.md` - Production operations
- `wydapt-journey-diagram.md` - Workflow visualization
- `c4-architecture-diagrams.md` - Architecture diagrams
- `docx-processing-architecture.md` - Document generation architecture
- `template-system-architecture.md` - Template system design
- `document-system-analysis.md` - Document system overview
- `remove-is-template-field.md` - Schema cleanup notes

**Integration Guides** (in `doc/public_site/integrations/`):
- Google Drive setup and configuration guide (if created)

---

## 💬 Notes from Last Session

**Session 2026-01-27**:
- **Focus**: Estate plan delete functionality and activity logging integration
- **Achievements**:
  - ✅ Created `DELETE /api/admin/estate-plans/:id` endpoint with admin level 2 protection
  - ✅ Added `?deletePeople=true` query param option (default: unlink only)
  - ✅ Cascade deletes through all related tables
  - ✅ Added `estate_plan` entity type to activity logger
  - ✅ Added 5 estate plan activity types (CREATED, UPDATED, AMENDED, IMPORTED, STATUS_CHANGED)
  - ✅ Added activity descriptions for estate plan events
  - ✅ Integrated activity logging into WealthCounsel import endpoint
  - ✅ Added delete button and confirmation modal to estate plan detail page
  - ✅ Created 32 unit tests for delete functionality
  - ✅ Fixed CI test failure by using lazy imports for `@nuxthub/db` in person-matching.ts
- **Technical Notes**:
  - Delete uses query params (not body) for `deletePeople` option due to Cloudflare Workers DELETE body issue
  - People deletion is attempted individually to handle cases where people have other relationships
  - Confirmation requires typing exact plan name to prevent accidental deletion
  - Activity logging captures full deletion summary for audit trail
- **Files Created**:
  - `server/api/admin/estate-plans/[id].delete.ts`
  - `tests/unit/estate-plan-delete.test.ts`
- **Files Modified**:
  - `server/utils/activity-logger.ts` - Estate plan entity type and activity types
  - `server/utils/activity-description.ts` - Estate plan activity descriptions
  - `server/utils/person-matching.ts` - Lazy imports for test compatibility
  - `server/api/admin/integrations/wealthcounsel/import.post.ts` - Activity logging
  - `app/pages/estate-plans/[id].vue` - Delete UI

**Session 2026-01-26**:
- **Focus**: Lawmatics import duplicate handling to prevent cascade failures
- **Problem Solved**: Duplicates and non-person contacts were skipped without adding to lookup cache, causing hundreds of note import errors
- **Achievements**:
  - ✅ Created `server/utils/duplicate-detector.ts` for email-based duplicate detection
  - ✅ Added `import_duplicates` table to track detected duplicates for review
  - ✅ Integrated duplicate detection into contacts phase of queue handler
  - ✅ Critical fix: Add duplicates to `peopleLookupCache` with existing person's ID
  - ✅ Updated email index in real-time as new contacts are processed
  - ✅ Added `duplicatesLinked` count to migration run API response
  - ✅ Added amber "Duplicates Linked" stat box to migration progress UI
  - ✅ Updated documentation in CURRENT_STATUS.md
- **Technical Notes**:
  - Email index built once at start of contacts phase (efficient O(1) lookups)
  - Duplicates logged to `import_duplicates` table with full source data JSON
  - Resolution tracking supports future manual review/resolution UI
  - Real-time index update catches duplicates within same import batch
- **Key Insight**: "By adding the duplicate to the lookup cache with the existing person's ID, all downstream prospects and notes will resolve correctly"
- **Files Created**:
  - `server/utils/duplicate-detector.ts`
- **Files Modified**:
  - `server/db/schema.ts` - Added `importDuplicates` table
  - `server/queue/lawmatics-import.ts` - Integrated duplicate detection
  - `server/api/admin/migrations/[id].get.ts` - Added duplicatesLinked count
  - `app/components/admin/MigrationProgress.vue` - UI for duplicates count
  - `app/pages/settings/integrations/lawmatics/migrate.vue` - Interface update
- **Migration**: `0013_dizzy_maverick.sql` (already generated)

**Session 2026-01-24**:
- **Focus**: Server-side pagination and Lawmatics import fix
- **Achievements**:
  - ✅ Created server-side pagination utility (`server/utils/pagination.ts`)
  - ✅ Created frontend pagination composable (`app/composables/usePaginatedData.ts`)
  - ✅ Added pagination UI to UiDataTable component
  - ✅ Updated 4 backend endpoints (clients, people, matters, referral-partners)
  - ✅ Updated 3 frontend pages (clients, people, matters)
  - ✅ Created 19 unit tests for pagination utilities
  - ✅ Fixed Lawmatics import - prospects were failing because contacts imported as people but lookup used users table
  - ✅ Added `buildPersonToUserMap()` and `ensurePersonIsClient()` functions
  - ✅ Created 22 regression tests for Lawmatics import fix
- **Technical Notes**:
  - Pagination is backward compatible - endpoints without params return all data
  - Multiple matters for same client now reuse the same user account (cached in personToUserMap)
  - Contacts imported as people are promoted to client/user when they have a prospect/matter
- **Key Insight**: "By definition, a person who has a matter associated with them is a client"
- **Files Created**:
  - `server/utils/pagination.ts`
  - `app/composables/usePaginatedData.ts`
  - `tests/unit/pagination.test.ts`
  - `tests/unit/lawmatics-import-prospects.test.ts`
- **Files Modified**:
  - `app/components/ui/DataTable.vue`
  - `server/queue/lawmatics-import.ts`
  - 4 backend endpoints + 3 frontend pages

**Session 2026-01-21**:
- **Focus**: Google Drive Integration, Toast Notifications, Notices System
- **Achievements**:
  - ✅ Toast notification system with vue-toastification
  - ✅ Google Drive integration with service account authentication
  - ✅ Drive folder sync for clients and matters
  - ✅ Drive status indicators (badges and sections) on detail pages
  - ✅ Force resync functionality for handling drive configuration changes
  - ✅ Auto-create client folder when creating matter
  - ✅ Notices system with database, API, and UI components
  - ✅ Notification bell in dashboard header with unread count
  - ✅ Notifications page with full history
  - ✅ Official Google Drive icon component
  - ✅ Lucide icons plugin for global icon registration
  - ✅ Fixed client sync status not persisting after page refresh
  - ✅ Fixed lawyers endpoint missing await and camelCase fields
- **Technical Notes**:
  - Google Drive API requires `supportsAllDrives: true` for Shared Drive operations
  - Service account with impersonation acts as the impersonated user (sees their drives)
  - JWT authentication uses Web Crypto API (compatible with Cloudflare Workers)
  - Drive credentials stored in database for admin-manageable configuration
  - Notices support both user-specific and role-broadcast targeting
- **Files Created** (key ones):
  - `/app/plugins/toast.client.ts` - Toast plugin
  - `/app/composables/useToast.ts` - Toast composable
  - `/app/composables/useNotices.ts` - Notices state management
  - `/app/components/drive/StatusBadge.vue` - Sync status badge
  - `/app/components/drive/StatusSection.vue` - Full Drive status card
  - `/app/components/notices/NotificationBell.vue` - Bell with badge
  - `/app/components/icons/GoogleDrive.vue` - Official Drive icon
  - `/server/utils/google-drive.ts` - Drive API utilities
  - `/server/utils/notice-service.ts` - Notice creation utilities
  - `/app/pages/settings/google-drive.vue` - Drive configuration page
  - Various API endpoints for Drive sync and notices
- **Next Up**: Commit and push, then continue with remaining features

**Session 2026-01-11**:
- **Focus**: E-Signature Integration Phase 3 Completion
- **Achievements**:
  - ✅ Resend email integration for signature requests and reminders
  - ✅ Signatures dashboard page (`/signatures`) with status cards and filterable table
  - ✅ Reminder/resend functionality with expiration extension option
  - ✅ Revoke functionality for pending sessions
  - ✅ Signed PDF download endpoint (public, token-based)
  - ✅ Fixed hubBlob deprecation (use `import { blob } from 'hub:blob'`)
  - ✅ Fixed CSS overflow on /clients page (`min-w-0` on flex children)
  - ✅ Added E-Signatures navigation item to dashboard sidebar
  - ✅ Added toast notifications and UI polish to roadmap
- **Technical Notes**:
  - Resend API key format: `re_...` (not UUID format)
  - Blob access: Use `import { blob } from 'hub:blob'` not deprecated `hubBlob()`
  - Flexbox overflow: `min-w-0` overrides implicit `min-width: auto`
- **Plan Status**: E-Signature Phases 1-3 complete, Phases 4-5 (KYC, ESIGN action items) remain for future
- **Next Up**: Toast notifications system, Payment Management UI, or continue with Enhanced Signature (Phase 4)

**Session 2026-01-10 (Late Evening)**:
- **Focus**: RBAC Testing Infrastructure & Page Restructuring
- **Achievements**:
  - ✅ Created centralized route configuration (`shared/routes.ts`)
  - ✅ Expanded E2E auth tests from 2 to 46 tests
  - ✅ Created RBAC E2E test suite (`tests/e2e/rbac.spec.ts`)
  - ✅ Created route unit tests (61 tests in `tests/unit/routes.test.ts`)
  - ✅ Moved all pages from `/app/pages/dashboard/` to flat structure
  - ✅ Updated all navigation and router paths
- **Files Created**:
  - `shared/routes.ts` - Single source of truth for routes and access control
  - `tests/e2e/rbac.spec.ts` - Role-based access control E2E tests
  - `tests/unit/routes.test.ts` - Route configuration unit tests
- **Why**: Attorney-client privilege requires comprehensive access control verification
- **Test Results**: 46 E2E tests passing, 61 route unit tests passing, 34 RBAC unit tests passing

**Session 2026-01-10 (Evening)**:
- **Focus**: Semgrep Security Fixes & UI Restructuring Completion
- **Achievements**:
  - ✅ Fixed 2 Semgrep XSS findings (`v-html` vulnerabilities)
  - ✅ Created `useSanitizedHtml` composable for reusable DOMPurify sanitization
  - ✅ Suppressed noisy stderr in template-renderer error tests
  - ✅ Auto-start service journeys when engagement journey completes
  - ✅ Added filters/search to matter list (search, status, client)
  - ✅ Created secure `/api/my-matters` endpoint for clients
  - ✅ Evaluated and completed UI restructuring plan
- **Files Created**:
  - `app/composables/useSanitizedHtml.ts`
  - `server/api/my-matters/index.get.ts`
- **Key Decision**: Journey automation vs manual start - design calls for auto-start when engagement completes, not manual "Start Journey" UI
- **Plan Status**: UI restructuring plan marked COMPLETED

**Session 2026-01-10 (Morning)**:
- **Focus**: Seed Data Improvements & Auto-Seeding
- **Achievements**:
  - ✅ Comprehensive seed data with 8 users, 3 matters, journeys, documents, relationships
  - ✅ Real DOCX content from `doc/word_document_templates/` parsed and stored
  - ✅ Documents now have DOCX blobs in R2 storage (not just templates)
  - ✅ Template renderer integration for variable substitution in seed documents
  - ✅ Auto-seeding on first request when database is empty (dev only)
  - ✅ New `server/utils/template-upload.ts` utility for reusable DOCX processing
  - ✅ Fixed deprecated `hubBlob()` across 6 files (now auto-imported `blob`)
  - ✅ Migration 0059 to fix column naming (counsel_approved → attorney_approved)
  - ✅ Updated README.md with modern quick-start guide
- **Developer Experience**:
  - `pnpm dev` + open browser = fully seeded database ready to test
  - No manual seed step required for fresh development
  - Test accounts documented in README.md
- **Technical Notes**:
  - Auto-seed uses `nitroApp.hooks.hookOnce('request', ...)` to ensure migrations run first
  - Seed reads DOCX files from filesystem, processes with template-upload utility
  - Documents get copies of template DOCX blobs with unique paths

**Session 2026-01-09**:
- **Focus**: Activity Logging System & Role Structure Clarification
- **Achievements**:
  - ✅ Activity logging system with request context capture
  - ✅ Referral partner management (CRUD APIs)
  - ✅ Marketing event and registration tables
  - ✅ Activity feed component and full activity log page
  - ✅ Navigation link to Activity Log for firm members
  - ✅ STAFF role added (internal firm employees like paralegals, secretaries)
  - ✅ ADVISOR role clarified (external third-parties with limited access)
  - ✅ RBAC utilities updated with `isFirmMember()` function
  - ✅ User management UI updated with STAFF option
  - ✅ Tests updated for new role structure
- **Role Structure (Clarified)**:
  - FIRM_ROLES: `['ADMIN', 'LAWYER', 'STAFF']` - Internal employees with broad access
  - ADVISOR: External third-parties (CPAs, financial advisors) with LIMITED access
  - CLIENT_ROLES: `['CLIENT']` - Engaged clients
  - PROSPECT_ROLES: `['PROSPECT', 'LEAD']` - Not yet engaged
- **Database Migration**: `0024_large_gertrude_yorkes.sql` (activities enhancement + new tables)

**Session 2026-01-08 (Evening)**:
- **Focus**: Firebase Authentication integration with OAuth providers
- **Achievements**:
  - ✅ Full Firebase Authentication implementation (Google, Microsoft, Apple, Facebook support)
  - ✅ Automatic account linking by email
  - ✅ OAuth-only user support (nullable password field)
  - ✅ Role-based navigation refactored for better configurability
  - ✅ Admin UI for OAuth provider management
  - ✅ Fixed hydration mismatches from password manager extensions (LastPass)
  - ✅ Added provider logos to `/public/icons/`
  - ✅ Profile page conditionally shows password section based on user auth type
- **Technical Challenges Solved**:
  - Firebase Admin SDK JSON parsing (Nuxt auto-parses env vars)
  - Password NOT NULL constraint for OAuth users (migration to make nullable)
  - SSR hydration mismatches (ClientOnly wrapper for forms)
  - Role-based navigation for different user types (ADMIN, LAWYER, CLIENT, PROSPECT, etc.)
- **Current State**:
  - Firebase OAuth working end-to-end with Google provider tested
  - Session management working across page navigations
  - Navigation shows only relevant items for user's role
  - Clean console (no Vue warnings except LastPass extension noise)
- **End of Session**: Documentation updated, SEMGREP added to roadmap

**Session 2026-01-07** (Previous):
- Completed NuxtHub 0.10.x migration
- Fixed document downloads and DOCX generation
- Converted 26 API endpoints to snake_case format

**Session 2026-01-06** (Previous):
- Multiple middle names functionality completed
- Action items & task management system implemented

---

**Next Session Options**:
1. **Payment Management** - Build payment recording UI (separate plan needed)
2. **Schema extraction** - Begin document template analysis and journey generation
3. **Replace remaining alert() calls** - Audit and migrate to toast notifications
4. **Continue API normalization** - Fix remaining ~70 endpoints as features are tested (on-demand)
5. **Matter deletion** - Implement delete functionality (deferred from this session)

---

## 📋 Future Considerations

### PDF/A Compliance for Signed Documents
- **Status**: Documented for future consideration
- **Context**: When implementing signed PDF generation, considered PDF/A (ISO 19005) for long-term archival
- **Decision**: Start with standard PDF using `pdf-lib` - legally sufficient under ESIGN/UETA
- **Why PDF/A might be needed later**:
  - Some government agencies require PDF/A for submissions
  - Financial institutions may require it for compliance
  - Long-term archival guarantees (fonts embedded, no external dependencies)
- **Implementation options if needed**:
  - Manual PDF/A metadata with pdf-lib (complex)
  - Server-side conversion via Adobe PDF Services API
  - Alternative library with native PDF/A support
- **Current approach**: Standard PDF with embedded signature, audit trail, and document hash is legally binding and tamper-evident for most use cases
