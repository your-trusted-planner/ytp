# Domain Model Analysis - Matters, Services, Journeys

**Date:** January 2026
**Purpose:** Clarify relationships and fix schema redundancies

---

## Current Schema

### 1. service_catalog (Product Definitions)
```typescript
- id
- name, description, category
- price (in cents)
- type (SINGLE/RECURRING)
- consultationFee
- engagementLetterId
- isActive
```
**Purpose:** Product catalog - what services we offer
**Example:** "Wyoming Domestic Asset Protection Trust - $15,000"

---

### 2. matters (Client Engagements)
```typescript
- id
- clientId → users
- title (e.g., "Smith Family Trust 2024")
- matterNumber
- description
- status (OPEN/CLOSED/PENDING)
- contractDate
```
**Purpose:** The engagement/SOW - created when client books consultation
**Example:** "Smith Family Matter #2024-001"

---

### 3. services (Engaged Service Instances)
```typescript
- id
- matterId → matters
- catalogId → serviceCatalog
- journeyId → journeys (OPTIONAL)
- engagementLetterDocId → documents
- status (PENDING/ACTIVE/COMPLETED/CANCELLED)
- fee (actual fee charged)
- paymentStatus (UNPAID/PARTIAL/PAID)
- totalPaid
- assignedAttorneyId
- parentServiceId (for maintenance)
```
**Purpose:** Specific service instance within a matter
**Example:** "WYDAPT service for Smith Family Matter"

**Current linkage:**
- Matter has multiple Services
- Service links to serviceCatalog (what product)
- Service optionally links to Journey

---

### 4. journeys (Workflow Templates)
```typescript
- id
- serviceCatalogId → serviceCatalog
- name (e.g., "Trust Formation Journey")
- description
- isTemplate (true/false)
- isActive
- estimatedDurationDays
```
**Purpose:** Workflow template definition
**Links to:** serviceCatalog (product definition)

**Current design:** Journey is a TEMPLATE linked to a product type

---

### 5. client_journeys (Client Progress)
```typescript
- id
- clientId → users
- journeyId → journeys
- currentStepId → journeySteps
- status (NOT_STARTED/IN_PROGRESS/COMPLETED/PAUSED/CANCELLED)
- priority
- startedAt, completedAt, pausedAt
```
**Purpose:** Track client's progress through a journey

**MISSING:**
- ❌ No link to matter
- ❌ No link to service

---

## Problems Identified

### Problem 1: service_catalog vs. services - Redundant?

**NO - Not redundant!**
- `service_catalog` = Product catalog (TEMPLATE)
- `services` = Engaged instances (INSTANCE)

This is like:
- `service_catalog` = "iPhone 15 Pro - $999"
- `services` = "John's iPhone 15 Pro - Order #12345"

**Recommendation:** Keep both, maybe rename for clarity:
- `service_catalog` → `service_catalog` (OK as-is)
- `services` → `engaged_services` or `service_instances` (more explicit)

---

### Problem 2: Journey Linkage Confusion

**Current State:**
- `journeys.serviceCatalogId` → Links journey template to product type
- `services.journeyId` → Links service instance to a journey (optional)

**User's Requirement:**
> "Journey should link to the service that journey is intended to deliver. Should be 1:1 services to journeys."

**Question:** Are journeys TEMPLATES or INSTANCES?

**Option A: Journeys are TEMPLATES**
```
serviceCatalog (WYDAPT product)
  → journey TEMPLATE (WYDAPT workflow)
     → service INSTANCE (client's engaged WYDAPT)
        → client_journey INSTANCE (client's progress)
```

**Option B: Journeys are INSTANCES (1:1 with services)**
```
serviceCatalog (WYDAPT product)
  → service INSTANCE (client's engaged WYDAPT)
     → journey INSTANCE (this client's workflow) [1:1]
        → client progress tracking
```

**Current schema suggests Option A**, but user description suggests **Option B**.

---

### Problem 3: client_journeys Missing Links

**Current:**
```typescript
client_journeys {
  clientId → users
  journeyId → journeys
  // Missing: matterId, serviceId
}
```

**User's Requirement:**
> "client_journeys definitely link to the matter"

**Also Question:** If `services` already has `journeyId` (1:1), do we need `client_journeys` at all?

---

## Proposed Model

### Option A: Journeys as Templates (current design, add links)

```
Client (user)
  └── Matter (engagement)
       └── Service (engaged service instance)
            ├── catalogId → service_catalog (which product)
            └── journeyId → journey TEMPLATE (which workflow)
                 └── client_journey (progress tracking)
                      ├── clientId → client
                      ├── journeyId → journey template
                      ├── matterId → matter (NEW)
                      └── serviceId → service (NEW)
```

**Changes needed:**
1. Add `matterId` to `client_journeys`
2. Add `serviceId` to `client_journeys`
3. Keep journey as template linked to service_catalog

**Pros:**
- Reusable journey templates
- Multiple clients can use same journey definition
- Admin configures journey once, applies to all

**Cons:**
- More complex: 3 tables (journeys, services, client_journeys)

---

### Option B: Journeys as Instances (1:1 with services)

```
Client (user)
  └── Matter (engagement)
       └── Service (engaged service instance)
            ├── catalogId → service_catalog (which product)
            ├── currentStepId (progress tracking)
            ├── journeyStatus
            └── journeyStartedAt

            (No separate journey or client_journey table needed)
```

**Changes needed:**
1. Remove `client_journeys` table entirely
2. Remove `journeys` table OR keep as "journey_templates"
3. Add journey progress fields to `services`:
   - currentStepId
   - journeyStatus
   - journeyStartedAt, journeyCompletedAt

**Pros:**
- Simpler: 1:1 relationship
- Service IS the journey instance
- Fewer tables, clearer ownership

**Cons:**
- Lose flexibility if we want to track multiple journey attempts
- Can't easily have journey separate from service

---

### Option C: Hybrid (Journey Templates + Service Instances)

```
service_catalog (product definitions)
  └── journey_template (workflow definition for this product)
       └── journey_steps (template steps)

Client (user)
  └── Matter (engagement)
       └── Service (engaged service instance)
            ├── catalogId → service_catalog
            ├── journeyTemplateId → journey_template
            ├── matterId → matter
            ├── currentStepId
            └── journeyStatus

            (service tracks its own progress, no separate client_journeys)
```

**Changes needed:**
1. Rename `journeys` → `journey_templates`
2. Keep `journey_templates.serviceCatalogId`
3. Remove `client_journeys` table
4. Add to `services`:
   - journeyTemplateId
   - currentStepId
   - journeyStatus
   - journeyStartedAt, journeyCompletedAt, journeyPausedAt

**Pros:**
- Clear separation: templates vs. instances
- Simple 1:1 between service and journey progress
- Still have reusable workflow templates

**Cons:**
- Can't track multiple journey attempts per service
- Migration required to move data

---

## Questions for You

**Q1: Are journeys reusable templates or 1:1 instances?**
- Template: "WYDAPT Journey" is defined once, used by all WYDAPT clients
- Instance: Each client's WYDAPT service has its own unique journey

**Q2: Can a client restart a journey or have multiple attempts?**
- If yes → Keep `client_journeys` separate
- If no → Merge into `services`

**Q3: Can a matter have multiple services going through different journeys simultaneously?**
- Example: Client engages WYDAPT + Annual Maintenance in same matter
- If yes → Need clear linkage matter → services → journeys

**Q4: What about the existing data?**
- Do we have data in production we need to migrate?
- Or is this still in PoC/dev stage where we can rewrite schema?

---

## My Recommendation

Based on your description, I recommend **Option C (Hybrid)**:

**Why:**
1. **Clear separation:** `journey_templates` (what to do) vs. `services` (who's doing it)
2. **1:1 relationship:** Each service instance tracks its own progress
3. **Simplifies queries:** Want to see client's journeys? Query their services + join to journey_templates
4. **Matches your model:** Service is the unit of sales/delivery, journey is how we deliver it

**Schema Changes:**
```sql
-- Rename journeys → journey_templates
ALTER TABLE journeys RENAME TO journey_templates;

-- Add journey tracking fields to services
ALTER TABLE services ADD COLUMN journey_template_id TEXT REFERENCES journey_templates(id);
ALTER TABLE services ADD COLUMN current_step_id TEXT REFERENCES journey_steps(id);
ALTER TABLE services ADD COLUMN journey_status TEXT DEFAULT 'NOT_STARTED';
ALTER TABLE services ADD COLUMN journey_started_at INTEGER;
ALTER TABLE services ADD COLUMN journey_completed_at INTEGER;
ALTER TABLE services ADD COLUMN journey_paused_at INTEGER;

-- Drop client_journeys (data migrated to services)
DROP TABLE client_journeys;
```

**Result:**
```
Client
  └── Matter
       └── Service
            ├── catalogId → service_catalog (which product)
            ├── journeyTemplateId → journey_template (which workflow)
            ├── currentStepId (where in workflow)
            └── journeyStatus (progress state)
```

Simple, clear, 1:1 as you described.

---

## What do you think?

Which option matches your vision? Or should we go a different direction?
