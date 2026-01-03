# WYDAPT Journey Implementation Gap Analysis

**Document Status:** Final Analysis
**Created:** January 2026
**Comparison Against:** `wydapt-journey-diagram.md` specification
**Overall Implementation Status:** 60-70% Complete

---

## Executive Summary

The WYDAPT journey implementation has **strong foundational architecture** but is missing **critical business logic** required by the specification. While the database schema, document template system, and basic journey framework exist, several key features—particularly payment processing, role conversion, and entity filing—are incomplete or missing entirely.

**Key Findings:**
- ✅ Database schema is complete and well-designed
- ✅ All 28 document templates imported and parsed
- ✅ Basic journey progression system functional
- ❌ **CRITICAL:** No payment collection for $375 fee or $7,500 deposits
- ❌ **CRITICAL:** No PROSPECT → CLIENT role conversion logic
- ❌ **CRITICAL:** Step count mismatch (7 vs. 8 steps)
- ❌ **CRITICAL:** Entity filing tracking (Step 7) not implemented

---

## Step-by-Step Comparison

### Step 1: Discovery Call Booking

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| 10-question intake questionnaire | ⚠️ Partial | Schema exists, no frontend UI |
| $375 consultation fee payment | ❌ Missing | LawPay auth exists, no payment endpoint |
| Google Calendar availability check | ❌ Missing | Calendar utils exist, no booking integration |
| Sync appointment to Calendar | ❌ Missing | JWT auth ready, no sync endpoint |
| Attorney notification | ⚠️ Partial | Database structure only, no email/SMS |

**Code References:**
- Schema: `server/database/schema.ts` lines 206-227 (questionnaires)
- Booking API: `server/api/public/booking/create.post.ts`
- Calendar utils: `server/utils/google-calendar.ts` (349 lines, auth only)

**Completion:** 25%

---

### Step 2: Discovery Consultation

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Attorney reviews questionnaire | ⚠️ Partial | No dedicated review UI |
| Conduct Zoom consultation | N/A | Offline activity |
| Attorney enters service options (Packages 1-4) | ⚠️ Partial | Schema exists, no UI |
| Generate engagement letter | ❌ Missing | Templates exist, no generation workflow |
| Send engagement letter for e-sign | ❌ Missing | No send workflow |

**Code References:**
- Service packages: `server/api/service-packages/index.post.ts`
- Appointments: `server/api/appointments/index.post.ts`
- Attorney notes: `server/api/attorney/questionnaire-notes.post.ts`

**Completion:** 30%

---

### Step 2b: Pay & Sign (CONVERSION POINT) ⚠️ CRITICAL GAP

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Client pays 50% ($7,500) | ❌ Missing | No payment endpoint |
| E-sign engagement letter | ⚠️ Partial | Signing exists, not tied to payment |
| Atomic payment + signature | ❌ Missing | No transaction bundling |
| PROSPECT → CLIENT conversion | ❌ Missing | **No conversion logic at all** |
| Payment must clear before conversion | ❌ Missing | No gate implemented |

**This is the most critical gap.** Without this step:
- Users remain PROSPECT forever (unless manually changed)
- No revenue collection for the main service
- Engagement letter signing has no business logic

**Completion:** 0%

---

### Step 3: Extended Discovery (BRIDGE - Conditional)

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Conditional/optional step | ❌ Missing | No framework for optional steps |
| Attorney determines if needed | ❌ Missing | No decision point in journey |
| Schedule follow-up Zoom | ⚠️ Partial | Appointments exist, not linked to step |
| May repeat until satisfied | ❌ Missing | No iteration logic for milestones |

**Code References:**
- Bridge conversations exist: `server/database/schema.ts` lines 316-324
- But only used for document revisions, not discovery

**Completion:** 0%

---

### Step 4: Document Drafting (BRIDGE)

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Generate documents from templates | ✅ Complete | `server/api/documents/generate-from-template.post.ts` |
| Attorney reviews generated docs | ⚠️ Partial | Can view, can't edit |
| Attorney edits as needed | ❌ Missing | No editing API |
| Attorney approves for client | ⚠️ Partial | Approval fields exist, no workflow |
| Iteration loop until approved | ⚠️ Partial | Bridge steps support iteration count |

**Code References:**
- Document generation: `server/api/documents/generate-from-template.post.ts`
- Batch generation: `server/api/journeys/generate-step-documents.post.ts`
- Template renderer: `server/utils/template-renderer.ts` (213 lines)
- Attorney approval schema: `documents.attorneyApproved`, `attorneyApprovedAt`

**Completion:** 60%

---

### Step 5: Ready for Signature (MILESTONE) ⚠️ CRITICAL GAP

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Attorney marks "ready to sign" | ❌ Missing | No endpoint to mark ready |
| Multi-channel notification | ❌ Missing | No email/SMS/Matrix |
| Client pays remaining 50% ($7,500) | ❌ Missing | **No payment endpoint** |
| Payment clears before signing unlocked | ❌ Missing | **No payment gate** |

**This is a critical revenue gate.** Without this:
- No collection of final $7,500 payment
- Clients can sign documents without paying
- No notification when documents are ready

**Completion:** 0%

---

### Step 6: Document Signing (MILESTONE)

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Send documents to PandaDoc/Proof | ⚠️ Partial | PandaDoc integration exists |
| Client reviews all documents | ⚠️ Partial | Individual review, not batch |
| Client e-signs documents | ✅ Complete | `server/api/documents/[id]/sign.post.ts` |
| Remote notarization (4 docs) | ⚠️ Partial | Individual notarization, not batch |
| Use Proof.com (per spec) | ❌ Missing | **Uses PandaDoc instead** |
| Notify attorney when complete | ❌ Missing | No notification |

**Code References:**
- Signing: `server/api/documents/[id]/sign.post.ts`
- Notarization: `server/api/documents/[id]/request-notarization.post.ts`
- PandaDoc utils: `server/utils/pandadoc.ts`
- Notary tracking: `server/database/schema.ts` lines 562-580

**Note:** Spec requires Proof.com for notarization, but implementation uses PandaDoc. This may be acceptable if PandaDoc supports remote notarization, but should be clarified.

**Completion:** 50%

---

### Step 7: Entity Filing (MILESTONE) ⚠️ CRITICAL GAP

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Review signed documents | ⚠️ Partial | Can view, no checklist |
| File SS-4 for DAPT EIN | ❌ Missing | **No filing tracking at all** |
| File SS-4 for PTC EIN | ❌ Missing | — |
| File SS-4 for LLC EIN(s) | ❌ Missing | — |
| File PTC Articles (WY SOS) | ❌ Missing | — |
| File PTC Affidavit (WY Banking) | ❌ Missing | — |
| Track filing status | ❌ Missing | — |
| Handle dependencies (Banking requires PTC EIN) | ❌ Missing | — |

**This is a complete gap.** There is zero implementation of entity filing tracking. This is required for WYDAPT formation completion.

**Recommendation:** Create new schema tables:
- `entity_filings` - track each filing (EIN, Articles, Affidavit)
- `filing_dependencies` - track prerequisites
- Add attorney/staff interface to record filing status and EIN numbers

**Completion:** 0%

---

### Step 8: Delivery & Completion (MILESTONE)

| Spec Requirement | Status | Implementation Notes |
|---|---|---|
| Package all final documents | ❌ Missing | No document packaging logic |
| Notify client (multi-channel) | ❌ Missing | No notifications |
| Client accesses in portal | ⚠️ Partial | Documents accessible individually |
| Mark journey COMPLETE | ✅ Complete | `clientJourneys.status = 'COMPLETED'` |
| Activate maintenance journey | ❌ Missing | **No auto-activation** |

**Code References:**
- Journey status: `server/database/schema.ts` line 269
- Maintenance link: `services.parentServiceId` exists but unused
- No activation logic in `server/api/client-journeys/`

**Completion:** 40%

---

## Journey Structure Mismatch

### Spec Defines 8 Steps

```
1. Discovery Call Booking
2. Discovery Consultation
2b. Pay & Sign (CONVERSION POINT)
3. Extended Discovery (conditional)
4. Document Drafting
5. Ready for Signature
6. Document Signing
7. Entity Filing
8. Delivery & Completion
```

### Implementation Has 7 Steps

From `server/api/admin/seed-wydapt.post.ts` (lines 26-97):

```typescript
const DOCUMENT_GROUPS = [
  { journeyStepName: 'Engagement & Initial Setup', stepOrder: 1 },
  { journeyStepName: 'Trust Formation - Review & Sign', stepOrder: 2 },
  { journeyStepName: 'Private Trust Company Setup', stepOrder: 3 },
  { journeyStepName: 'Special Purpose Trust (if applicable)', stepOrder: 4 },
  { journeyStepName: 'Investment Committee Formation', stepOrder: 5 },
  { journeyStepName: 'Asset Contribution Process', stepOrder: 6 },
  { journeyStepName: 'Distribution Management (Ongoing)', stepOrder: 7 }
]
```

**Analysis:** The implementation groups Steps 1-3 into "Engagement & Initial Setup" and doesn't explicitly separate:
- Discovery consultation
- Payment & conversion
- Extended discovery
- Ready for signature
- Entity filing
- Completion/delivery

**Recommendation:** Either:
1. Restructure to match 8-step spec exactly, OR
2. Update spec to match 7-step implementation with clear mapping

---

## Payment Processing Gaps ⚠️ CRITICAL

### Required Payments (Per Spec)

| Payment | Amount | When | Gate For | Status |
|---|---|---|---|---|
| Consultation Fee | $375 | Before booking | Appointment scheduling | ❌ Not implemented |
| First 50% | $7,500 | With engagement letter | PROSPECT → CLIENT | ❌ Not implemented |
| Final 50% | $7,500 | Before signing | Document signing unlock | ❌ Not implemented |

### Implementation Status

**LawPay Integration:**
- ✅ OAuth2 authentication complete (`server/api/auth/lawpay/`)
- ✅ Token storage in `lawpayConnections` table
- ✅ Utility functions in `server/utils/lawpay.ts`
- ❌ **NO payment collection endpoints**
- ❌ **NO webhook integration**
- ❌ **NO payment validation**

**Database Schema:**
- ✅ `servicePayments` table exists with payment types: `CONSULTATION`, `DEPOSIT_50`, `FINAL_50`
- ✅ `services.paymentStatus` tracks UNPAID/PARTIAL/PAID
- ✅ `publicBookings.consultationFeePaid` flag exists
- ❌ **NO API endpoints create payment records**

**Missing Endpoints:**
```
POST /api/payments/consultation-fee    (❌ doesn't exist)
POST /api/payments/deposit             (❌ doesn't exist)
POST /api/payments/final-payment       (❌ doesn't exist)
POST /api/webhooks/lawpay              (❌ doesn't exist)
```

**Impact:** Without payment collection:
- No revenue from consultation fees
- No revenue from WYDAPT services
- Payment gates can't function
- Role conversion can't happen

---

## Role Conversion Gap ⚠️ CRITICAL

### Spec Requirement

At Step 2b (Pay & Sign):
1. Client pays 50% ($7,500)
2. Client signs engagement letter
3. **Both must succeed atomically**
4. System converts user from PROSPECT to CLIENT
5. Journey can then continue

### Implementation Status

**User Roles Defined:**
```typescript
// server/database/schema.ts line 9
role: text('role', {
  enum: ['ADMIN', 'LAWYER', 'CLIENT', 'LEAD', 'PROSPECT']
}).notNull().default('PROSPECT')
```

**Status Defined:**
```typescript
// server/database/schema.ts line 13
status: text('status', {
  enum: ['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']
}).notNull().default('PROSPECT')
```

**Missing Logic:**
- ❌ No endpoint to convert role
- ❌ No "check payment + signature" condition
- ❌ No atomic transaction bundling
- ❌ No step gate requiring CLIENT role before proceeding

**Needed Endpoint:**
```typescript
// Doesn't exist - needs creation
POST /api/client-journeys/[id]/convert-to-client

// Should:
// 1. Verify engagement letter signed
// 2. Verify $7,500 payment received
// 3. Update user.role = 'CLIENT'
// 4. Update user.status = 'ACTIVE'
// 5. Advance journey to next step
// 6. All in single transaction
```

---

## Document Template Status ✅ COMPLETE

### All 28 Templates Imported

From `server/api/admin/seed-wydapt.post.ts`:

**Engagement (1 template):**
- ✅ Engagement Agreement

**Trust Documents (6 templates):**
- ✅ DAPT Trust Agreement - Grantor - 1 Grantor
- ✅ DAPT Trust Agreement - Grantor - 2 Grantors
- ✅ DAPT Trust Agreement - Non-Grantor - 1 Grantor
- ✅ DAPT Trust Agreement - Non-Grantor - 2 Grantors
- ✅ Certificate of Trust - 1 Grantor
- ✅ Certificate of Trust - 2 Grantors

**PTC Documents (4 templates):**
- ✅ Private Trust Company Operating Agreement - 1 Trustee
- ✅ Private Trust Company Operating Agreement - 2 Trustees
- ✅ PTC Organizational Meeting - 1 Trustee
- ✅ PTC Organizational Meeting - 2 Trustees

**NCSPT Documents (4 templates):**
- ✅ Non-Charitable Special Purpose Trust Agreement - 1 Trustee
- ✅ Non-Charitable Special Purpose Trust Agreement - 2 Trustees
- ✅ NCSPT Certificate of Trust - 1 Trustee
- ✅ NCSPT Certificate of Trust - 2 Trustee

**Investment Committee (3 templates):**
- ✅ Investment Committee Charter
- ✅ Investment Committee Organizational Meeting
- ✅ Investment Policy Statement

**Contribution Documents (5 templates):**
- ✅ Contribution of Personal Property
- ✅ Contribution of Real Property
- ✅ Contribution of Minerals
- ✅ Assignment of Interests in LLC
- ✅ Contribution of Crypto

**Distribution Documents (5 templates):**
- ✅ Request for Distribution
- ✅ Distribution Report
- ✅ Distribution Notice
- ✅ Distribution Acknowledgement
- ✅ Distribution Committee Meeting Minutes

**Template Processing:**
- ✅ All templates uploaded to Cloudflare R2
- ✅ Variables extracted from each template
- ✅ Template metadata stored in `document_templates` table
- ✅ Notarization requirements flagged correctly

**Notarization Flags:**
Per spec, 4 documents require notarization:
- ✅ DAPT Trust Agreement (all variants) - `requiresNotary: true`
- ✅ Certificate of Trust - `requiresNotary: true`
- ⚠️ Statutory Affidavit documents not in template list (may be missing)
- ⚠️ PTC Statutory Affidavit not in template list (may be missing)

**Potential Gap:** Spec mentions "Statutory Affidavit (DAPT)" and "PTC Statutory Affidavit" as requiring notarization, but these don't appear in the 28 templates. Need to verify if these are:
1. Missing templates that need to be added
2. Part of another document (e.g., included in Trust Agreement)
3. Filed by attorney separately (not client-signed)

---

## Service Package System

### Spec Requirement

Packages 1-4 define which documents are included:
- Package 1: DAPT Trust documents only
- Package 2: + PTC documents
- Package 3: + LLC formation documents
- Package 4: + Special Purpose Trust documents

### Implementation Status ⚠️ PARTIAL

**Database Schema:** ✅ Complete
```typescript
// server/database/schema.ts lines 524-535
export const servicePackages = sqliteTable('service_packages', {
  id: text('id').primaryKey(),
  serviceCatalogId: text('service_catalog_id'),
  packageNumber: integer('package_number').notNull(),
  packageName: text('package_name').notNull(),
  packageDescription: text('package_description'),
  includedDocuments: text('included_documents').notNull(), // JSON array
  additionalFee: integer('additional_fee').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
})

// Client selection tracking
export const clientSelectedPackages = sqliteTable('client_selected_packages', {
  serviceId: text('service_id'),
  packageId: text('package_id'),
  selectedAt: integer('selected_at', { mode: 'timestamp' }),
})
```

**API Endpoints:** ⚠️ Partial
- ✅ `POST /api/service-packages` - Create package
- ✅ `GET /api/service-packages` - List packages
- ⚠️ `POST /api/service-packages/select` - Doesn't exist (need this for Step 2)
- ❌ No UI for attorney to select during consultation

**Missing Functionality:**
1. Attorney interface to select packages during Step 2 consultation
2. Link between package selection and document generation
3. Automatic document filtering based on selected package
4. Package pricing calculation ($15,000 base + additional fees)

---

## Notarization System

### Spec Requirement

- Use **Proof.com** for remote online notarization
- 4 documents in **single notary session**:
  1. DAPT Trust Agreement
  2. Certificate of Trust (DAPT)
  3. Statutory Affidavit (DAPT)
  4. PTC Statutory Affidavit

### Implementation Status ⚠️ PARTIAL

**Current Implementation:**
- Uses **PandaDoc** for notarization (not Proof.com as spec requires)
- Individual document notarization (not batch/session)
- Offline notary workaround exists

**Code References:**
- PandaDoc integration: `server/utils/pandadoc.ts`
- Notarization request: `server/api/documents/[id]/request-notarization.post.ts`
- Offline notary upload: `server/api/notary/upload.post.ts`
- Notary tracking schema: `server/database/schema.ts` lines 562-580

**Offline Notary Workflow (Implemented):**
1. Staff downloads document (marks `notaryDocuments.status = 'DOWNLOADED'`)
2. Document notarized in person
3. Staff uploads notarized PDF
4. System updates status to `UPLOADED`/`COMPLETED`

**Missing for Spec Compliance:**
1. ❌ Proof.com API integration (currently PandaDoc)
2. ❌ Multi-document notarization session
3. ❌ Automatic grouping of 4 required docs
4. ❌ Single notary appointment scheduling

**Question:** Is PandaDoc acceptable, or is Proof.com specifically required? PandaDoc supports notarization but may have different pricing/features.

---

## Google Calendar Integration

### Spec Requirement

Step 1 requires:
- Check Google Calendar availability
- Book appointment in lawyer's calendar
- Bi-directional sync (system → Google, Google → system)

### Implementation Status ⚠️ INFRASTRUCTURE ONLY

**What Exists:**
- ✅ Google Calendar utilities: `server/utils/google-calendar.ts` (349 lines)
- ✅ JWT authentication for service account
- ✅ List events, get free/busy, create events
- ✅ `attorneyCalendars` table for multi-calendar support
- ✅ Attorney calendar management API: `server/api/attorney/calendars/`

**What's Missing:**
- ❌ Public booking → Calendar event creation
- ❌ Availability checking before booking confirmation
- ❌ Webhook handling for calendar updates from Google
- ❌ Sync conflicts resolution
- ❌ Integration into `server/api/public/booking/create.post.ts`

**Code Location:**
- Calendar utils: `server/utils/google-calendar.ts`
- Attorney calendars API: `server/api/attorney/calendars/index.get.ts`
- Booking API (needs calendar integration): `server/api/public/booking/create.post.ts`

**Recommendation:**
Add calendar integration to booking flow:
```typescript
// In server/api/public/booking/create.post.ts
// After payment verification:
const calendar = await getAttorneyCalendar(attorneyId)
const event = await createCalendarEvent({
  summary: `WYDAPT Consultation - ${firstName} ${lastName}`,
  start: appointmentTime,
  duration: 60, // minutes
  attendees: [email]
})
```

---

## Multi-Channel Notifications

### Spec Requirement

Multiple steps require notifications via:
- Email
- SMS
- Matrix (messaging platform)

**Required Notification Points:**
1. Step 1: Attorney notified of new consultation
2. Step 2b: Client notified engagement letter ready
3. Step 5: Client notified documents ready for signature
4. Step 5: Client notified payment required
5. Step 6: Attorney notified signing complete
6. Step 8: Client notified documents ready for download

### Implementation Status ❌ MISSING

**Current State:**
- ❌ No email integration
- ❌ No SMS integration (Twilio or similar)
- ❌ No Matrix integration
- ⚠️ Database has notification concept but not implemented

**Needed Infrastructure:**
- Email provider (Resend, SendGrid, AWS SES)
- SMS provider (Twilio)
- Matrix SDK integration
- Notification queue system
- Template system for messages
- User notification preferences

**Code Locations:**
- No notification utilities exist yet
- Could create: `server/utils/notifications.ts`
- Could create: `server/api/notifications/send.post.ts`

---

## Critical Missing Endpoints

### Payment Endpoints

```typescript
// Need to create these:
POST /api/payments/consultation-fee
  Body: { bookingId, amount, lawpayToken }
  Returns: { paymentId, status, confirmationNumber }

POST /api/payments/deposit
  Body: { serviceId, amount, lawpayToken }
  Returns: { paymentId, status }
  Side effects: Triggers PROSPECT → CLIENT conversion

POST /api/payments/final-payment
  Body: { serviceId, amount, lawpayToken }
  Returns: { paymentId, status }
  Side effects: Unlocks document signing

POST /api/webhooks/lawpay
  Body: LawPay webhook payload
  Returns: { success: true }
  Side effects: Updates payment status
```

### Role Conversion

```typescript
POST /api/client-journeys/[id]/convert-to-client
  Body: { engagementLetterId, paymentId }
  Returns: { success, userId, newRole }
  Validation:
    - Engagement letter must be signed
    - Payment must be received ($7,500)
    - Both conditions must be met
  Side effects:
    - user.role = 'CLIENT'
    - user.status = 'ACTIVE'
    - Advance journey to Step 3
```

### Document Workflows

```typescript
POST /api/documents/[id]/mark-ready-for-signature
  Body: { documentIds: string[] }
  Returns: { success, documentsMarked }
  Side effects:
    - Sets readyForSignature = true
    - Triggers client notification
    - Requires final payment before unlocking

PUT /api/documents/[id]/edit
  Body: { content: string }
  Returns: { documentId, version }
  Validation: Only attorney can edit

POST /api/documents/batch-sign
  Body: { documentIds: string[], signatureData }
  Returns: { signedDocuments }
  For: Multi-document signing session
```

### Entity Filing

```typescript
// Completely new domain - needs full CRUD
POST /api/entity-filings
  Body: {
    clientJourneyId,
    filingType: 'EIN_DAPT' | 'EIN_PTC' | 'EIN_LLC' | 'PTC_ARTICLES' | 'PTC_AFFIDAVIT',
    status: 'PENDING' | 'FILED' | 'RECEIVED',
    confirmationNumber,
    ein // for EIN filings
  }

GET /api/entity-filings?clientJourneyId=[id]
  Returns: List of all filings for journey

PUT /api/entity-filings/[id]
  Body: { status, confirmationNumber, ein }
  For: Updating filing status when EIN received
```

---

## Implementation Priorities

### 🔴 CRITICAL (Must-Have for MVP)

1. **Payment Collection System** (Est: 1-2 weeks)
   - Implement LawPay payment endpoints
   - Add consultation fee ($375) payment flow
   - Add deposit ($7,500) payment flow
   - Add final payment ($7,500) payment flow
   - Add LawPay webhook handling
   - **Impact:** Without this, no revenue can be collected

2. **Role Conversion Logic** (Est: 3-5 days)
   - Create PROSPECT → CLIENT conversion endpoint
   - Verify payment + signature atomically
   - Gate journey progression on CLIENT role
   - **Impact:** Without this, users stuck as PROSPECT forever

3. **Step Structure Alignment** (Est: 1 week)
   - Decide: match spec (8 steps) or update spec (7 steps)
   - If matching spec, add Steps 2b, 5, 7, 8 explicitly
   - Update seed data and journey generation
   - **Impact:** Confusion about which step is active

4. **Entity Filing Tracking** (Est: 1 week)
   - Create entity filing schema tables
   - Build CRUD endpoints for filings
   - Add attorney/staff UI to record EINs
   - Track filing dependencies
   - **Impact:** Can't complete WYDAPT formation without EINs

### 🟡 HIGH (Should-Have for Full Feature Parity)

5. **Document Workflow Improvements** (Est: 1 week)
   - Attorney document editing API
   - "Mark ready for signature" endpoint
   - Batch signing for multiple documents
   - Attorney approval workflow

6. **Engagement Letter Generation** (Est: 3-5 days)
   - Create endpoint to generate from template
   - Link to package selection
   - Send for e-signature workflow

7. **Step 5 Payment Gate** (Est: 2-3 days)
   - Implement payment requirement before signing
   - Lock/unlock signing flow based on payment
   - Multi-channel notification when ready

8. **Notifications System** (Est: 1 week)
   - Email integration (Resend or SendGrid)
   - SMS integration (Twilio)
   - Notification templates
   - Delivery at key step transitions

### 🟢 MEDIUM (Nice-to-Have)

9. **Google Calendar Integration** (Est: 3-5 days)
   - Integrate calendar availability check into booking
   - Auto-create calendar events
   - Sync appointments

10. **Service Package Selection UI** (Est: 3-5 days)
    - Attorney interface during consultation
    - Link packages to document generation
    - Calculate pricing with additional fees

11. **Extended Discovery Step** (Est: 1 week)
    - Add optional/conditional step framework
    - Attorney decision point
    - Step skipping logic

12. **Proof.com Integration** (Est: 1-2 weeks)
    - Replace PandaDoc with Proof.com (if required)
    - Multi-document notarization session
    - Or: verify PandaDoc meets requirements

13. **Maintenance Journey Activation** (Est: 2-3 days)
    - Auto-create maintenance service at completion
    - Link via `parentServiceId`
    - Schedule annual renewals

---

## Database Schema Gaps

### Missing Tables

**Entity Filings** (needs creation):
```typescript
export const entityFilings = sqliteTable('entity_filings', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id),
  filingType: text('filing_type', {
    enum: ['EIN_DAPT', 'EIN_PTC', 'EIN_LLC', 'PTC_ARTICLES', 'PTC_AFFIDAVIT']
  }),
  entityName: text('entity_name'), // "Smith Family DAPT", "Smith PTC"
  status: text('status', {
    enum: ['PENDING', 'FILED', 'RECEIVED', 'FAILED']
  }),
  filedAt: integer('filed_at', { mode: 'timestamp' }),
  receivedAt: integer('received_at', { mode: 'timestamp' }),
  confirmationNumber: text('confirmation_number'),
  ein: text('ein'), // For EIN filings
  prerequisiteFilingId: text('prerequisite_filing_id'), // e.g., PTC EIN before Affidavit
  notes: text('notes'),
  filedBy: text('filed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})
```

**Notifications** (needs creation):
```typescript
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  type: text('type', {
    enum: ['EMAIL', 'SMS', 'MATRIX', 'IN_APP']
  }),
  subject: text('subject'),
  message: text('message'),
  status: text('status', {
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED']
  }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  metadata: text('metadata'), // JSON for provider-specific data
  createdAt: integer('created_at', { mode: 'timestamp' })
})
```

### Existing Tables Needing Updates

**None** - Current schema is well-designed and doesn't need structural changes. All gaps are in API/business logic, not schema.

---

## Testing Gaps

### Integration Tests Needed

1. **Payment Flow Tests**
   - Test consultation fee payment
   - Test deposit payment + role conversion
   - Test final payment + signing unlock
   - Test payment failure scenarios
   - Test LawPay webhook handling

2. **Journey Progression Tests**
   - Test each step advancement
   - Test conditional step logic
   - Test step completion validation
   - Test role gates (CLIENT required for Steps 3+)

3. **Document Generation Tests**
   - Test all 28 templates render correctly
   - Test variable substitution
   - Test package-based document filtering
   - Test notarization flag correctness

4. **Role Conversion Tests**
   - Test atomic payment + signature
   - Test partial success rollback
   - Test duplicate conversion prevention

### Manual Testing Checklist

**End-to-End WYDAPT Journey:**
- [ ] Prospect completes questionnaire
- [ ] Prospect pays $375 consultation fee
- [ ] Appointment synced to Google Calendar
- [ ] Attorney reviews questionnaire
- [ ] Attorney selects Package 1-4 during consultation
- [ ] System generates engagement letter
- [ ] Prospect reviews and signs engagement letter
- [ ] Prospect pays $7,500 deposit
- [ ] System converts prospect to CLIENT atomically
- [ ] System generates all documents for selected package
- [ ] Attorney reviews and approves documents
- [ ] System notifies client documents ready
- [ ] Client pays final $7,500
- [ ] System unlocks signing
- [ ] Client signs all documents in batch
- [ ] Client completes notarization for 4 docs in single session
- [ ] Attorney/staff records entity filings
- [ ] System tracks EIN receipts
- [ ] System packages final documents
- [ ] Client downloads all documents
- [ ] System activates maintenance journey

**Currently Working:** Only steps 9-11 (document generation and review)

---

## Recommendations Summary

### Immediate Actions (Next 2 Weeks)

1. **Clarify Step Structure**
   - Decision: Match 8-step spec or update spec to 7 steps?
   - If 8 steps, create migration to add missing steps
   - Document mapping between spec and implementation

2. **Implement Payment System**
   - Start with consultation fee payment (simplest)
   - Then add deposit and final payment
   - Build LawPay webhook handler
   - Add payment validation gates

3. **Build Role Conversion**
   - Create atomic conversion endpoint
   - Verify payment + signature
   - Update user role and status
   - Gate journey on CLIENT role

4. **Entity Filing Tracking**
   - Create schema tables
   - Build CRUD endpoints
   - Add staff interface to record filings

### Medium-Term (1-2 Months)

5. **Complete Document Workflows**
   - Attorney editing
   - Ready for signature workflow
   - Batch signing
   - Multi-doc notarization

6. **Add Notifications**
   - Email at minimum (SMS optional)
   - Key transition points
   - Templates for each notification type

7. **Calendar Integration**
   - Booking flow integration
   - Availability checking
   - Auto-event creation

### Long-Term (2-3 Months)

8. **Extended Discovery**
   - Optional step framework
   - Conditional logic
   - Step iteration

9. **Proof.com or PandaDoc Verification**
   - Confirm notarization provider
   - Implement multi-doc sessions
   - Test 4-doc notarization flow

10. **Maintenance Journey**
    - Auto-activation logic
    - Annual renewal tracking
    - Distribution request workflow

---

## Questions for Product Owner

1. **Step Structure:** Should we match the 8-step spec exactly, or is the 7-step implementation acceptable with updated documentation?

2. **Notarization Provider:** Is Proof.com specifically required, or is PandaDoc acceptable if it supports remote notarization?

3. **Payment Priority:** Which payment flow should we implement first?
   - Consultation fee ($375)
   - Deposit ($7,500)
   - Final payment ($7,500)

4. **Entity Filing:** Should EIN filing be automated via IRS API, or manual tracking by staff is sufficient?

5. **Missing Templates:** The spec mentions "Statutory Affidavit (DAPT)" and "PTC Statutory Affidavit" but these aren't in the 28 templates. Are these:
   - Missing and need to be added?
   - Included in other documents?
   - Filed by attorney separately?

6. **Extended Discovery:** How important is the optional "Extended Discovery" step? Can it be deferred to Phase 2?

7. **Notifications:** What's the minimum viable notification system?
   - Email only?
   - Email + SMS?
   - All three (Email + SMS + Matrix)?

8. **Calendar Integration:** Is Google Calendar sync required for MVP, or can manual appointment management suffice initially?

---

## Conclusion

The WYDAPT journey implementation has **solid architectural foundations** but is missing **critical business logic** for payment processing, role conversion, and entity filing. The most urgent gaps are:

1. **No payment collection** → No revenue
2. **No role conversion** → Users stuck as PROSPECT
3. **No entity filing tracking** → Can't complete formation
4. **Step structure mismatch** → Confusion about progress

Addressing these four critical gaps would bring the implementation to ~80-85% feature parity with the spec. The remaining features (notifications, calendar sync, extended discovery) are important but not blocking for a functional MVP.

**Estimated Effort to Address Critical Gaps:** 4-6 weeks of development

**Recommended Approach:**
- Week 1-2: Payment system + role conversion
- Week 3: Entity filing tracking
- Week 4: Step structure alignment + testing
- Week 5-6: Document workflow improvements + notifications (email only)

This would result in a functional WYDAPT journey that can collect payments, convert prospects to clients, track entity filings, and deliver completed documents.
