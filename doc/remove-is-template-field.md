# Remove `is_template` Field from Journeys

## Overview

Removed the `is_template` field from the journeys data model and UI to align with the intended domain architecture.

## Problem Statement

The `is_template` boolean field on the `journeys` table created confusion about the data model:

- **Conceptual Issue**: All records in the `journeys` table are templates by definition
- **Architectural Mismatch**: The distinction between template and active journeys is handled by the table structure itself:
  - `journeys` table = Template definitions (reusable workflow patterns)
  - `client_journeys` table = Active instances (journeys in progress for specific clients/matters)
- **UI Confusion**: The badge showing "Template" vs "Active" was misleading since there should be no non-template journeys in the `journeys` table

## Solution

Remove the `is_template` field entirely from the data model and UI.

---

## Changes Made

### 1. Database Migration

**File**: `/server/database/migrations/0012_remove_is_template_from_journeys.sql`

```sql
ALTER TABLE `journeys` DROP COLUMN `is_template`;
```

**Rationale**: All journeys are templates; the field adds no value and creates confusion.

---

### 2. API Updates

#### Create Journey Endpoint

**File**: `/server/api/journeys/index.post.ts`

**Changes**:
- Removed `is_template` from journey object (line 23)
- Removed from INSERT query (line 32)
- Removed from bind parameters (line 40)

**Before**:
```typescript
const journey = {
  id: nanoid(),
  service_catalog_id: body.serviceCatalogId || null,
  name: body.name,
  description: body.description || null,
  is_template: body.isTemplate ? 1 : 0,  // ← REMOVED
  is_active: 1,
  estimated_duration_days: body.estimatedDurationDays || null,
  created_at: Date.now(),
  updated_at: Date.now()
}
```

**After**:
```typescript
const journey = {
  id: nanoid(),
  service_catalog_id: body.serviceCatalogId || null,
  name: body.name,
  description: body.description || null,
  is_active: 1,
  estimated_duration_days: body.estimatedDurationDays || null,
  created_at: Date.now(),
  updated_at: Date.now()
}
```

#### Update Journey Endpoint

**File**: `/server/api/journeys/[id].put.ts`

**Changes**:
- Removed `is_template` from UPDATE query (line 30)
- Removed from bind parameters (line 39)

**Before**:
```typescript
await db.prepare(`
  UPDATE journeys
  SET
    name = ?,
    description = ?,
    service_catalog_id = ?,
    is_template = ?,  // ← REMOVED
    is_active = ?,
    estimated_duration_days = ?,
    updated_at = ?
  WHERE id = ?
`).bind(
  body.name,
  body.description || null,
  body.serviceCatalogId || null,
  body.isTemplate ? 1 : 0,  // ← REMOVED
  body.isActive ? 1 : 0,
  body.estimatedDurationDays || null,
  Date.now(),
  journeyId
).run()
```

---

### 3. UI Component Updates

#### Journey Edit Modal

**File**: `/app/components/journey/EditModal.vue`

**Changes**:
1. **Removed checkbox** (lines 35-45):
   - Removed the "This is a template" checkbox from form
2. **Updated TypeScript interface**:
   - Removed `is_template?: boolean` from Journey interface
3. **Updated form object**:
   - Removed `isTemplate: false` from form ref
4. **Updated watch function**:
   - Removed `isTemplate: Boolean(journey.is_template)` from form population
5. **Updated API call**:
   - Removed `isTemplate: form.value.isTemplate` from PUT request body

#### Journey List Page

**File**: `/app/pages/dashboard/journeys/index.vue`

**Changes**:
1. **Removed badge display** (lines 52-59):
   - Removed the badge showing "Template" vs "Active"
2. **Updated form object**:
   - Removed `isTemplate: false` from form ref
3. **Updated create modal**:
   - Removed "This is a template" checkbox (lines 124-134)
4. **Updated `handleJourneySaved` function**:
   - Removed `journey.is_template = data.isTemplate` assignment
5. **Updated `duplicateJourney` function**:
   - Removed `isTemplate: Boolean(journey.is_template)` from form
6. **Updated `saveJourneyName` function**:
   - Removed `isTemplate: Boolean(journey.is_template)` from PUT request body

---

## Files Modified

### Database
- ✅ `/server/database/migrations/0012_remove_is_template_from_journeys.sql` (new)

### API Endpoints
- ✅ `/server/api/journeys/index.post.ts` (create journey)
- ✅ `/server/api/journeys/[id].put.ts` (update journey)

### UI Components
- ✅ `/app/components/journey/EditModal.vue` (edit modal component)
- ✅ `/app/pages/dashboard/journeys/index.vue` (journey list page)

### No Changes Required
- `/server/api/journeys/index.get.ts` - Uses `SELECT *` so no changes needed
- `/app/pages/dashboard/journeys/[id].vue` - Doesn't reference is_template

---

## Impact

### User Experience
- **Simpler UI**: Removed confusing checkbox that had no practical purpose
- **Clearer Mental Model**: All journeys in the journeys list are templates by definition
- **No Functional Loss**: The field provided no actual functionality

### Data Model
- **Cleaner Schema**: Removed redundant field that conflicted with table semantics
- **Better Alignment**: Data model now matches domain architecture
- **Clearer Intent**: `journeys` table clearly represents templates only

### Active Journeys
Active journey instances are tracked in the `client_journeys` table, which includes:
- `client_id` - Who the journey is for
- `journey_id` - Which template is being used
- `matter_id` - Which matter it's associated with
- `status` - Current status (NOT_STARTED, IN_PROGRESS, COMPLETED, etc.)
- `current_step_id` - Where they are in the workflow

---

## Migration Notes

**Local Development**:
```bash
pnpm run db:migrate
```

**Production**:
```bash
pnpm run db:migrate:remote
```

**Data Safety**: No data loss - the column only contained boolean values that weren't providing meaningful distinction.

---

## Future Considerations

The `is_active` field remains on the `journeys` table for soft-delete functionality (archiving journey templates without removing them entirely). This is a valid use case distinct from the template/instance distinction.
