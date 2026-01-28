# Lawmatics Data Migration - Design Document

## Overview

This document describes the architecture and implementation plan for importing data from Lawmatics CRM into the estate planning platform. The migration is designed to be:

- **Resumable** - Can recover from failures without starting over
- **Incremental** - Can sync new/changed records after initial import
- **Observable** - Progress tracking and error visibility
- **Efficient** - Respects API rate limits while maximizing throughput

---

## 1. Problem Statement

### Data Volume
Based on current Lawmatics data:
- **Contacts**: ~8,982 records
- **Prospects (Matters)**: ~1,802 records
- **Timeline Activities**: ~102,339 records (25 per page = 4,094 pages)
- **Notes**: TBD (fetched per entity)
- **Custom Fields**: Embedded in contact/prospect records

### Technical Constraints
- **Cloudflare Workers**: 30-second execution limit per request
- **Lawmatics API**: Rate limits unknown, but ~2-3 seconds per page observed
- **Timeline Activities**: 4,094 pages × 2-3 sec = 2-3+ hours for full import

### Requirements
1. Admin can configure Lawmatics API credentials
2. Admin can trigger a migration run
3. Migration runs in background without blocking
4. Progress is visible in real-time
5. Failures are logged and recoverable
6. Duplicate records are handled (upsert logic)
7. Can re-run to sync new data

---

## 2. Architecture

### Queue-Based Processing

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin UI      │     │   Migration     │     │   Cloudflare    │
│   (Trigger)     │────▶│   Controller    │────▶│   Queue         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Progress      │◀────│   Queue         │◀────│   Lawmatics     │
│   Tracker (D1)  │     │   Consumer      │     │   API           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │   D1 Database   │
                        │   (upsert)      │
                        └─────────────────┘
```

### Components

1. **Migration Controller** (`/api/admin/migrations/lawmatics`)
   - Validates API credentials
   - Creates migration run record
   - Queues initial page fetch jobs
   - Returns immediately with migration ID

2. **Cloudflare Queue** (`lawmatics-import`)
   - Processes page fetch jobs
   - Each job fetches one page, transforms, inserts
   - Queues next page if more data exists
   - Updates progress tracker

3. **Progress Tracker** (D1 table)
   - Tracks migration run status
   - Records pages processed, records imported, errors
   - Enables resume from last successful page

4. **Admin UI** (`/admin/integrations/lawmatics`)
   - Configure API key
   - Trigger migration
   - View progress in real-time
   - View error log

---

## 3. Schema Changes

### 3.1 New Table: `integrations`

Stores integration configurations (API keys, settings).

```typescript
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['LAWMATICS', 'WEALTHCOUNSEL'] }).notNull(),
  name: text('name').notNull(), // Display name

  // Encrypted credentials (stored in KV for security, reference here)
  credentialsKey: text('credentials_key'), // KV key for encrypted credentials

  // Connection status
  status: text('status', { enum: ['CONFIGURED', 'CONNECTED', 'ERROR'] }).notNull().default('CONFIGURED'),
  lastTestedAt: integer('last_tested_at', { mode: 'timestamp' }),
  lastErrorMessage: text('last_error_message'),

  // Settings
  settings: text('settings'), // JSON: integration-specific settings

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
```

### 3.2 New Table: `migration_runs`

Tracks each migration execution.

```typescript
export const migrationRuns = sqliteTable('migration_runs', {
  id: text('id').primaryKey(),
  integrationId: text('integration_id').notNull().references(() => integrations.id),

  // Run configuration
  runType: text('run_type', { enum: ['FULL', 'INCREMENTAL'] }).notNull(),
  entityTypes: text('entity_types').notNull(), // JSON array: ['contacts', 'prospects', 'activities']

  // Status
  status: text('status', {
    enum: ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']
  }).notNull().default('PENDING'),

  // Progress tracking
  totalEntities: integer('total_entities'), // Estimated total (if known)
  processedEntities: integer('processed_entities').notNull().default(0),
  createdRecords: integer('created_records').notNull().default(0),
  updatedRecords: integer('updated_records').notNull().default(0),
  skippedRecords: integer('skipped_records').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),

  // Checkpoint for resume
  checkpoint: text('checkpoint'), // JSON: {entity: 'contacts', page: 45, ...}

  // Timing
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
```

### 3.3 New Table: `migration_errors`

Logs individual record errors for debugging.

```typescript
export const migrationErrors = sqliteTable('migration_errors', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => migrationRuns.id, { onDelete: 'cascade' }),

  entityType: text('entity_type').notNull(), // 'contact', 'prospect', 'activity'
  externalId: text('external_id'), // Lawmatics record ID

  errorType: text('error_type', { enum: ['TRANSFORM', 'VALIDATION', 'INSERT', 'API'] }).notNull(),
  errorMessage: text('error_message').notNull(),
  errorDetails: text('error_details'), // JSON: stack trace, raw data, etc.

  // For retry
  retryCount: integer('retry_count').notNull().default(0),
  retriedAt: integer('retried_at', { mode: 'timestamp' }),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
```

### 3.4 Unified Import Metadata Column

Instead of separate columns per source system, add a single `importMetadata` JSON column to all importable tables. This provides flexibility for multiple import sources and arbitrary tracking data.

**Schema Addition:**
```typescript
// Add to: users, matters, activities, notes, referralPartners
importMetadata: text('import_metadata'), // JSON object
```

**Import Metadata Structure:**
```typescript
interface ImportMetadata {
  source: 'LAWMATICS' | 'WEALTHCOUNSEL' | 'CLIO' | string
  externalId: string           // ID in source system
  importedAt: string           // ISO timestamp of import
  lastSyncedAt?: string        // ISO timestamp of last sync
  importRunId?: string         // Reference to migration_runs.id

  // Data quality flags
  flags?: string[]             // ['REVIEW_NEEDED', 'DUPLICATE_EMAIL', 'POSSIBLY_NOT_PERSON']

  // Source-specific data (varies by source)
  sourceData?: {
    originalEmail?: string     // If email was modified for dedup
    contactType?: string       // Lawmatics custom contact type
    customFields?: Record<string, any>  // Preserved custom fields
    [key: string]: any
  }
}
```

**Example Values:**
```json
// User imported from Lawmatics
{
  "source": "LAWMATICS",
  "externalId": "24819750",
  "importedAt": "2025-01-23T14:30:00Z",
  "lastSyncedAt": "2025-01-23T14:30:00Z",
  "importRunId": "run_abc123",
  "flags": ["REVIEW_NEEDED", "DUPLICATE_EMAIL"],
  "sourceData": {
    "originalEmail": "shared@couple.com",
    "contactType": "Client",
    "customFields": {
      "Preferred Contact Method": "Phone",
      "Net Worth Range": "$1M-$5M"
    }
  }
}

// Activity imported from Lawmatics
{
  "source": "LAWMATICS",
  "externalId": "timeline_98765",
  "importedAt": "2025-01-23T15:45:00Z",
  "importRunId": "run_abc123"
}
```

**Benefits:**
- Single column works for all source systems
- Extensible without schema changes
- Preserves source data for debugging/auditing
- Enables incremental sync via `lastSyncedAt`
- Supports future imports (WealthCounsel, Clio, etc.)

**Querying:**
```sql
-- Find all records imported from Lawmatics
SELECT * FROM users WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'

-- Find records needing review
SELECT * FROM users WHERE json_extract(import_metadata, '$.flags') LIKE '%REVIEW_NEEDED%'

-- Find by external ID
SELECT * FROM users WHERE json_extract(import_metadata, '$.externalId') = '24819750'
```

**Index Consideration:**
For performance on large tables, consider a generated column + index:
```sql
-- Generated column for common lookups
ALTER TABLE users ADD COLUMN import_source TEXT
  GENERATED ALWAYS AS (json_extract(import_metadata, '$.source'));
CREATE INDEX idx_users_import_source ON users(import_source);
```

---

## 4. Data Mapping

### 4.0 Lawmatics User → User (Staff/Attorney)

Lawmatics users (staff who log in) are imported first to enable referential integrity.

| Lawmatics Field | Our Field | Transform |
|-----------------|-----------|-----------|
| `id` | `users.lawmaticsId` | Direct |
| `first_name` | `users.firstName` | Direct |
| `last_name` | `users.lastName` | Direct |
| `email` | `users.email` | Direct (required) |
| `role` | `users.role` | Map: see below |
| `created_at` | `users.createdAt` | Parse timestamp |

**Role Mapping (Lawmatics User → Our User):**
| Lawmatics Role | Our Role |
|----------------|----------|
| Owner | ADMIN |
| Admin | ADMIN |
| Attorney | LAWYER |
| Paralegal | STAFF |
| Staff | STAFF |
| (other) | STAFF |

**Note:** Lawmatics users are imported with `status: 'INACTIVE'` and no password. They cannot log in until manually activated and given credentials.

---

### 4.1 Contact → User + ClientProfile

| Lawmatics Field | Our Field | Transform |
|-----------------|-----------|-----------|
| `id` | `users.lawmaticsId` | Direct |
| `first_name` | `users.firstName` | Direct |
| `last_name` | `users.lastName` | Direct |
| `email` | `users.email` | Direct, required for user creation |
| `phone` | `users.phone` | Direct |
| `contact_type` | `users.role` | Map: see below |
| `created_at` | `users.createdAt` | Parse timestamp |
| `birthdate` | `clientProfiles.dateOfBirth` | Parse date |
| `address` | `clientProfiles.address` | Parse from JSON if structured |
| `city` | `clientProfiles.city` | Direct or parse from address |
| `state` | `clientProfiles.state` | Direct or parse from address |
| `zipcode` | `clientProfiles.zipCode` | Direct or parse from address |
| `marital_status` | (future field or metadata) | Store in metadata for now |
| `custom_fields` | (field mapping) | Configurable mapping |

**Role Mapping:**
- Lawmatics `contact_type` is custom per account
- Default: All contacts → `CLIENT` role
- May need configurable mapping based on Lawmatics custom contact types

**Email Handling:**
- Contacts without email: Generate placeholder (`lawmatics_{id}@placeholder.local`) or skip
- Duplicate emails: Merge strategy needed (prefer existing, update fields)

### 4.2 Prospect → Matter

| Lawmatics Field | Our Field | Transform |
|-----------------|-----------|-----------|
| `id` | `matters.lawmaticsId` | Direct |
| `contact_id` | `matters.clientId` | Lookup user by lawmaticsId |
| `case_title` | `matters.title` | Direct |
| `case_number` | `matters.matterNumber` | Direct |
| `case_blurb` | `matters.description` | Direct |
| `status` | `matters.status` | Map: hired→OPEN, pnc→CLOSED, etc. |
| `lead_attorney_id` | `matters.leadAttorneyId` | Lookup user (if attorneys imported) |
| `created_at` | `matters.createdAt` | Parse timestamp |

**Status Mapping:**
| Lawmatics Status | Our Status |
|------------------|------------|
| `hired` | `OPEN` |
| `pnc` (prospective not converted?) | `CLOSED` |
| `active` | `OPEN` |
| `closed` | `CLOSED` |
| `pending` | `PENDING` |
| (other) | `PENDING` (default) |

### 4.3 Timeline Activity → Activity

| Lawmatics Field | Our Field | Transform |
|-----------------|-----------|-----------|
| `id` | `activities.lawmaticsId` | Direct |
| `type` | `activities.type` | Map to our activity types |
| `description` | `activities.description` | Direct |
| `created_at` | `activities.createdAt` | Parse timestamp |
| `contact_id` or `prospect_id` | `activities.targetId` | Lookup by lawmaticsId |
| (infer from association) | `activities.targetType` | 'client' or 'matter' |
| User who performed | `activities.userId` | May default to system user |

**Activity Type Mapping:**
Need to analyze Lawmatics activity types and map to our enum. Common types:
- Email sent/received
- Call logged
- Note added
- Status changed
- Document uploaded

### 4.4 Note → Note

| Lawmatics Field | Our Field | Transform |
|-----------------|-----------|-----------|
| `id` | `notes.lawmaticsId` | Direct |
| `content` | `notes.content` | Direct |
| `contact_id` | `notes.entityId` (+ entityType='client') | Lookup user by lawmaticsId |
| `prospect_id` | `notes.entityId` (+ entityType='matter') | Lookup matter by lawmaticsId |
| `created_by_id` | `notes.createdBy` | Lookup user or default to system |
| `created_at` | `notes.createdAt` | Parse timestamp |

---

## 5. Import Flow

### 5.1 Migration Phases

```
Phase 0: Users          (prerequisite: none - import staff/attorneys first)
    ↓
Phase 1: Contacts       (prerequisite: users - need created_by lookups)
    ↓
Phase 2: Prospects      (prerequisite: contacts + users - need clientId, lead_attorney lookups)
    ↓
Phase 3: Notes          (prerequisite: contacts + prospects - need entity lookups)
    ↓
Phase 4: Activities     (prerequisite: all above - need entity lookups)
```

**Phase 0: Users** imports Lawmatics staff/attorneys as our users (role=ADMIN/LAWYER/STAFF). This enables proper referential integrity for `created_by`, `lead_attorney_id`, etc. in subsequent phases.

### 5.2 Queue Message Types

```typescript
interface ImportPageMessage {
  type: 'IMPORT_PAGE'
  runId: string
  entity: 'contacts' | 'prospects' | 'notes' | 'activities'
  page: number
  perPage: number
  // For notes/activities that are per-entity
  parentEntity?: 'contact' | 'prospect'
  parentId?: string
}

interface PhaseCompleteMessage {
  type: 'PHASE_COMPLETE'
  runId: string
  entity: 'contacts' | 'prospects' | 'notes' | 'activities'
}
```

### 5.3 Processing Flow

**Start Migration:**
1. Admin triggers migration via API
2. Controller creates `migration_runs` record
3. Controller queues first page: `{type: 'IMPORT_PAGE', entity: 'contacts', page: 1}`
4. Returns migration run ID immediately

**Process Page:**
1. Queue consumer receives page message
2. Fetch page from Lawmatics API
3. For each record:
   - Transform to our schema
   - Upsert (insert or update by lawmaticsId)
   - Log errors to `migration_errors`
4. Update `migration_runs` progress
5. If more pages: queue next page
6. If last page: queue phase complete message

**Phase Complete:**
1. Check if all pages processed successfully
2. If errors < threshold: proceed to next phase
3. Queue first page of next entity type
4. If final phase: mark migration complete

### 5.4 Resumability

**Checkpoint Storage:**
```json
{
  "currentPhase": "activities",
  "phases": {
    "contacts": { "status": "complete", "totalPages": 90, "processedPages": 90 },
    "prospects": { "status": "complete", "totalPages": 19, "processedPages": 19 },
    "notes": { "status": "complete", "totalPages": 150, "processedPages": 150 },
    "activities": { "status": "running", "totalPages": 4094, "processedPages": 2150 }
  }
}
```

**Resume Logic:**
1. Load checkpoint from `migration_runs.checkpoint`
2. Find first incomplete phase
3. Queue next unprocessed page
4. Continue from there

---

## 6. API Endpoints

### 6.1 Integration Management

```
GET    /api/admin/integrations                    # List all integrations
POST   /api/admin/integrations                    # Create integration
GET    /api/admin/integrations/:id                # Get integration details
PUT    /api/admin/integrations/:id                # Update integration
DELETE /api/admin/integrations/:id                # Delete integration
POST   /api/admin/integrations/:id/test           # Test connection
```

### 6.2 Migration Operations

```
GET    /api/admin/migrations                      # List migration runs
POST   /api/admin/migrations                      # Start new migration
GET    /api/admin/migrations/:id                  # Get migration status
POST   /api/admin/migrations/:id/pause            # Pause running migration
POST   /api/admin/migrations/:id/resume           # Resume paused migration
POST   /api/admin/migrations/:id/cancel           # Cancel migration
GET    /api/admin/migrations/:id/errors           # Get error log
POST   /api/admin/migrations/:id/errors/:errorId/retry  # Retry failed record
```

### 6.3 Real-time Progress

Option A: **Polling**
- Frontend polls `GET /api/admin/migrations/:id` every 2-5 seconds
- Simple, works with current architecture

Option B: **Server-Sent Events (SSE)**
- `GET /api/admin/migrations/:id/stream`
- Real-time updates as pages complete
- Better UX but more complex

**Recommendation:** Start with polling, add SSE later if needed.

---

## 7. Cloudflare Queue Configuration

### 7.1 Queue Setup

Add to `wrangler.jsonc`:

```jsonc
{
  "queues": {
    "producers": [
      { "queue": "lawmatics-import", "binding": "LAWMATICS_IMPORT_QUEUE" }
    ],
    "consumers": [
      {
        "queue": "lawmatics-import",
        "max_batch_size": 1,  // Process one page at a time
        "max_retries": 3,
        "dead_letter_queue": "lawmatics-import-dlq"
      }
    ]
  }
}
```

### 7.2 Rate Limiting

To respect Lawmatics API limits:
- Process one page at a time (`max_batch_size: 1`)
- Add delay between pages if needed (via queue retry delay)
- Monitor for 429 errors and back off

### 7.3 Error Handling

- **Transient errors** (network, 500s): Retry via queue (up to 3 times)
- **Permanent errors** (400s, validation): Log to `migration_errors`, continue
- **Rate limit errors** (429): Pause migration, alert admin
- **Dead letter queue**: For messages that fail all retries

---

## 8. Admin UI

### 8.1 Integration Settings Page

`/admin/integrations/lawmatics`

```
┌─────────────────────────────────────────────────────────────────┐
│ Lawmatics Integration                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ API Key: [••••••••••••••••••••••••]  [Test Connection]         │
│                                                                 │
│ Status: ● Connected (last tested 5 minutes ago)                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Data Mapping                                                    │
│                                                                 │
│ Contact Type Mapping:                                           │
│ ┌─────────────────┬─────────────────┐                          │
│ │ Lawmatics Type  │ Our Role        │                          │
│ ├─────────────────┼─────────────────┤                          │
│ │ Client          │ CLIENT     ▼    │                          │
│ │ Lead            │ PROSPECT   ▼    │                          │
│ │ Referral Source │ (skip)     ▼    │                          │
│ └─────────────────┴─────────────────┘                          │
│                                                                 │
│ [Save Settings]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Migration Run Page

`/admin/integrations/lawmatics/migrate`

```
┌─────────────────────────────────────────────────────────────────┐
│ Lawmatics Migration                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ New Migration                                                   │
│                                                                 │
│ Type: ○ Full Import   ● Incremental (since last run)           │
│                                                                 │
│ Entities to import:                                             │
│ ☑ Contacts (→ Clients)                                         │
│ ☑ Prospects (→ Matters)                                        │
│ ☑ Notes                                                        │
│ ☑ Timeline Activities                                          │
│                                                                 │
│ [Start Migration]                                               │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Current Run: #42 (started 15 minutes ago)                      │
│                                                                 │
│ Phase: Activities (4/4)                                         │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░ 52%                   │
│                                                                 │
│ Progress:                                                       │
│ • Contacts:   8,982 imported (complete)                        │
│ • Prospects:  1,802 imported (complete)                        │
│ • Notes:      2,456 imported (complete)                        │
│ • Activities: 53,234 / 102,339 (processing...)                 │
│                                                                 │
│ Errors: 12 [View Details]                                       │
│                                                                 │
│ [Pause]  [Cancel]                                               │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ Previous Runs                                                   │
│ ┌────────┬─────────────┬──────────┬──────────┬─────────┐       │
│ │ Run    │ Date        │ Type     │ Records  │ Status  │       │
│ ├────────┼─────────────┼──────────┼──────────┼─────────┤       │
│ │ #41    │ Jan 20      │ Incr.    │ 234      │ ✓ Done  │       │
│ │ #40    │ Jan 15      │ Full     │ 113,581  │ ✓ Done  │       │
│ │ #39    │ Jan 10      │ Full     │ 0        │ ✗ Failed│       │
│ └────────┴─────────────┴──────────┴──────────┴─────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

### 9.1 API Key Storage

- Store Lawmatics API key encrypted in Cloudflare KV
- Reference key stored in `integrations.credentialsKey`
- Never log or expose API key in errors

### 9.2 Access Control

- Migration endpoints require ADMIN role
- Log all migration operations to activity log
- Include IP/user agent for audit trail

### 9.3 Data Validation

- Validate/sanitize all incoming data before insert
- Reject records with invalid required fields
- Log validation errors for review

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Data transformation functions
- Status mapping logic
- Upsert logic (create vs update)

### 10.2 Integration Tests

- Mock Lawmatics API responses
- Test pagination handling
- Test error scenarios (network failure, rate limit)

### 10.3 Staging Test

- Run against Lawmatics sandbox/test account
- Verify data integrity after import
- Measure actual timing

---

## 11. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Schema migrations (integrations, migration_runs, migration_errors)
- [ ] Add lawmaticsId to users, matters, activities, notes
- [ ] Integration settings API (store credentials)
- [ ] Basic admin UI for credentials

### Phase 2: Contact Import
- [ ] Lawmatics API client (auth, pagination)
- [ ] Contact → User+ClientProfile transformer
- [ ] Queue producer/consumer setup
- [ ] Contact import with progress tracking

### Phase 3: Matter Import
- [ ] Prospect → Matter transformer
- [ ] Link matters to clients via lawmaticsId lookup
- [ ] Status mapping configuration

### Phase 4: Notes Import
- [ ] Notes API integration
- [ ] Note transformer with entity resolution
- [ ] Attach notes to clients/matters

### Phase 5: Activity Import
- [ ] Timeline API integration (handle large volume)
- [ ] Activity transformer with type mapping
- [ ] Incremental sync support (by date)

### Phase 6: Polish
- [ ] Admin UI refinements
- [ ] Error retry UI
- [ ] Incremental sync improvements
- [ ] Documentation

---

## 12. Design Decisions

These questions have been resolved:

### 12.1 Custom Field Mapping
**Decision:** Store custom fields as JSON metadata for later reference. We may need them, and storing preserves optionality.

```typescript
// Add to users table or clientProfiles
lawmaticsCustomFields: text('lawmatics_custom_fields'), // JSON blob
```

### 12.2 Contacts Without Email
**Decision:** Allow null email for imported contacts, but require email for new contacts created in our system.

**Rationale:** Lawmatics has contacts without email. Blocking import would lose data. But our system should require email going forward for proper user management.

**Schema implication:** `users.email` needs to be nullable (currently `.notNull()`), OR create a separate import path that bypasses email requirement.

### 12.3 Duplicate Handling
**Decision:** This is a complex problem that deserves its own design. For MVP migration:
- Import all records as-is (including duplicates)
- Flag potential duplicates for manual review
- Build proper merge/dedupe UI as a separate feature

**Why it's complex:**
- Lawmatics allows duplicate emails (common for spouse pairs sharing email)
- Some "contacts" are actually entities like bank accounts, not people
- Duplicate matching is a CRM feature we need long-term, not just for migration

### 12.4 User/Staff Import
**Decision:** Yes, import Lawmatics users (attorneys, staff) as our users.

**Rationale:** Needed for referential integrity on imported records (lead_attorney_id, created_by_id, etc.)

**Mapping:**
| Lawmatics Role | Our Role |
|----------------|----------|
| Owner/Admin | ADMIN |
| Attorney | LAWYER |
| Paralegal/Staff | STAFF |

### 12.5 Referral Source Import
**Decision:** Yes, map Lawmatics sources to our referralPartners table.

**Note:** Lawmatics has a "Referrals" source that links to contact records for attribution. This is interesting but **not MVP** - we'll import basic sources without the contact-referral linking for now.

---

## 13. Data Quality Challenges

### 13.1 Non-Person Contacts

**Problem:** Some Lawmatics accounts store non-person entities as contacts (banks, trusts, companies).

**Detection Heuristics:**
```typescript
function isProbablyPerson(contact: LawmaticsContact): boolean {
  const name = `${contact.first_name} ${contact.last_name}`.toLowerCase()

  // Red flags for non-person records
  const nonPersonIndicators = [
    'bank', 'trust', 'llc', 'inc', 'corp', 'foundation',
    'account', 'financial', 'insurance', 'company'
  ]

  if (nonPersonIndicators.some(ind => name.includes(ind))) {
    return false
  }

  // Positive signals for person records
  const hasFirstAndLast = contact.first_name && contact.last_name
  const hasBirthdate = !!contact.birthdate
  const hasPhone = !!contact.phone

  // If has both names and either birthdate or phone, likely a person
  return hasFirstAndLast && (hasBirthdate || hasPhone)
}
```

**Import Strategy:**
- Run heuristics on each contact
- Flag uncertain records with `importFlags: ['REVIEW_NEEDED', 'POSSIBLY_NOT_PERSON']`
- Import anyway (don't block), but surface for admin review

### 13.2 Duplicate Emails (Spouse Pairs)

**Problem:** Couples often share an email address. Lawmatics allows this; our system (currently) doesn't.

**Options:**
1. **Allow duplicate emails** (schema change) - Track that records share email
2. **Append suffix** - `john@example.com` and `jane+spouse@example.com`
3. **Merge into one record** - Loses data
4. **Flag for review** - Import with placeholder, let admin resolve

**Recommendation for MVP:** Option 4 - Import with generated placeholder for duplicates, flag for review.

```typescript
// For second+ contact with same email:
email: `${originalEmail}+lawmatics${contactId}@imported.local`
importFlags: ['DUPLICATE_EMAIL', 'REVIEW_NEEDED']
originalEmail: originalEmail  // Store for reference
```

### 13.3 Import Flags Schema

Add to track data quality issues:

```typescript
// Add to users table
importSource: text('import_source'), // 'LAWMATICS', 'WEALTHCOUNSEL', null for native
importFlags: text('import_flags'), // JSON array: ['REVIEW_NEEDED', 'DUPLICATE_EMAIL', ...]
importedAt: integer('imported_at', { mode: 'timestamp' }),
```

---

## 14. Future: Duplicate Matching System

This section outlines the **future** duplicate matching system (not MVP, but informs migration design).

### Requirements
- Identify potential duplicate contacts across data sources
- Present merge candidates to admin for review
- Support merge operations that preserve data
- Handle ongoing duplicate detection (not just migration)

### Matching Criteria
- Exact email match
- Fuzzy name match (Levenshtein distance, phonetic matching)
- Phone number normalization and match
- Address similarity

### UI Concept
```
┌─────────────────────────────────────────────────────────────────┐
│ Potential Duplicates                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Match Score: 85%                              [Review] [Skip]││
│ │                                                             ││
│ │ Record A (Lawmatics)        Record B (Native)              ││
│ │ ─────────────────────       ─────────────────────          ││
│ │ John Smith                  Jonathan Smith                 ││
│ │ john@smith.com              john@smith.com                 ││
│ │ (555) 123-4567              555-123-4567                   ││
│ │ Created: Jan 2023           Created: Mar 2024              ││
│ │ Matters: 2                  Matters: 1                     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This is a separate feature epic, but migration should preserve enough data (lawmaticsId, originalEmail, importFlags) to enable it later.

---

## 15. Incremental Sync Strategy

### 15.1 Resolved: Import Order
**Decision:** Users (Phase 0) are imported before contacts (Phase 1). This ensures `created_by` references resolve correctly during contact import.

### 15.2 Activity Incremental Sync

Given the volume of activities (100K+ records), incremental sync is essential for ongoing synchronization.

**Approach:** Track last sync timestamp per entity type, filter API requests by date.

**Implementation:**
```typescript
// In migration_runs or integrations table
lastSyncTimestamps: text('last_sync_timestamps'), // JSON

// Structure:
{
  "users": "2025-01-23T14:30:00Z",
  "contacts": "2025-01-23T14:35:00Z",
  "prospects": "2025-01-23T14:40:00Z",
  "notes": "2025-01-23T15:00:00Z",
  "activities": "2025-01-23T18:45:00Z"  // Most recent activity sync
}
```

**Sync Flow for Activities:**
1. Read `lastSyncTimestamps.activities` from integration config
2. Query Lawmatics API with `?updated_since={timestamp}` (or equivalent filter)
3. Import only new/updated records since that date
4. On success, update `lastSyncTimestamps.activities` to current time

**API Request:**
```typescript
// Lawmatics timeline endpoint with date filter
const params = {
  fields: 'all',
  page: 1,
  per_page: 25,
  // Filter for records updated after last sync
  'filter_by': 'updated_at',
  'filter_op': 'gt',
  'filter_on': lastSyncTimestamp
}
```

**Benefits:**
- Reduces API calls dramatically for incremental runs
- Avoids deduplication complexity (only fetching new records)
- Fast ongoing sync after initial full import

**Full vs Incremental Run:**
- **Full Import:** Ignores `lastSyncTimestamps`, fetches everything, upserts by externalId
- **Incremental Import:** Uses `lastSyncTimestamps`, fetches only new/changed, upserts

**Admin UI Option:**
```
Migration Type:
○ Full Import (re-import all data, ~3 hours for activities)
● Incremental (only changes since Jan 23, ~5 minutes)
```

### 15.3 Deduplication Strategy

With incremental sync, deduplication is simpler:

1. **During import:** Upsert by `importMetadata.externalId`
   - If record with same externalId exists → update
   - If no match → insert

2. **Query for upsert:**
```sql
-- Find existing record by external ID
SELECT id FROM activities
WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
  AND json_extract(import_metadata, '$.externalId') = ?
```

3. **No timestamp-based dedup needed:** Since we're filtering by `updated_since`, we won't re-fetch old records.

---

## 17. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-23 | Initial | Created design document |
| 2025-01-23 | Update | Resolved open questions: custom fields (store JSON), null emails (allow for imports), duplicates (flag for review, future dedupe system), users (import for referential integrity), referral sources (import, but contact-attribution not MVP). Added data quality section (non-person detection, spouse email handling). Added Phase 0 for user import. |
| 2025-01-23 | Update | Replaced per-source columns with unified `importMetadata` JSON column. Added incremental sync strategy for activities using `updated_since` filtering. Confirmed users import before contacts. |
