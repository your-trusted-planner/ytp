# UI Impact Analysis - Domain Model Migration

**Date:** January 2026
**Migration:** 0011_restructure_services_to_junction.sql

---

## Summary

The domain model restructuring has **minimal breaking changes** to the UI. Most components will continue to work with small adjustments to handle the new data structure.

---

## Key Changes to Data Structure

### Before (services table):
```typescript
{
  id: string,              // Unique service ID
  matterId: string,
  catalogId: string,
  fee: number,            // Actual fee charged
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  createdAt: timestamp
}
```

### After (matters_to_services junction):
```typescript
{
  matterId: string,        // Part of composite PK
  catalogId: string,       // Part of composite PK
  engagedAt: timestamp,    // Renamed from createdAt
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  startDate: timestamp | null,
  endDate: timestamp | null,
  assignedAttorneyId: string | null,

  // Joined from service_catalog:
  name: string,
  description: string,
  price: number,          // From catalog (not per-engagement override)
  type: 'SINGLE' | 'RECURRING',
  category: string
}
```

---

## Affected UI Components

### 1. ✅ ALREADY WORKS: `/app/pages/dashboard/cases/index.vue` (Matters page)

**What it does:**
- Displays list of matters
- Allows editing matters and adding services to them
- Shows associated services for each matter

**API calls:**
- ✅ `GET /api/matters/${id}/services` - Already updated
- ✅ `POST /api/matters/${id}/services` - Already updated

**Required UI changes:**
```diff
Line 135-140: Display services
- <div v-for="service in services" :key="service.id">
+ <div v-for="service in services" :key="`${service.matterId}-${service.catalogId}`">
    <div class="font-medium">{{ service.name }}</div>
-   <div class="text-xs">{{ formatPrice(service.fee) }} • {{ service.status }}</div>
+   <div class="text-xs">{{ formatPrice(service.price) }} • {{ service.status }}</div>
  </div>
```

**Impact:** ⚠️ MINOR - Need to update key binding and price field

---

### 2. ✅ ALREADY WORKS: `/app/pages/dashboard/clients/[id].vue` (Client detail page)

**What it does:**
- Displays client journeys
- Shows journey progress and status

**API calls:**
- ✅ `GET /api/client-journeys/client/${clientId}` - Already updated

**Required UI changes:**
- ✅ **None** - API response now includes `matter_title` and `matter_number` which enriches the display

**Impact:** ✅ NO CHANGES NEEDED (enhancement only)

---

### 3. ⚠️ POTENTIAL IMPACT: Payment-related components

**Search results:** Only found in `/app/pages/book.vue` (public booking page)

**If payment UI exists elsewhere:**

**Before:**
```typescript
// Payments were at service level
servicePayments.serviceId → services.id
```

**After:**
```typescript
// Payments are now at matter level
payments.matterId → matters.id
```

**Required changes:**
- Update any payment forms to reference `matterId` instead of `serviceId`
- Update payment queries to fetch by matter, not service
- Payment totals are now aggregated at matter level

**Impact:** ⚠️ MEDIUM - If payment UI exists, needs refactoring

---

### 4. ⚠️ POTENTIAL IMPACT: Package selection

**File:** `/app/pages/dashboard/admin/packages.vue`

**Table affected:** `client_selected_packages`

**Before:**
```typescript
{
  serviceId: string  // FK to services
}
```

**After:**
```typescript
{
  serviceId: string | null,  // Legacy, will be removed
  matterId: string,          // New
  catalogId: string          // New
}
```

**Required changes:**
- Update package selection to store `matterId` and `catalogId`
- Update queries to use composite key instead of `serviceId`

**Impact:** ⚠️ MEDIUM - Package selection needs updating

---

## Data Display Changes

### Composite Keys Instead of IDs

**Problem:** No more single `service.id` for v-for keys

**Solution:** Use composite key:
```vue
<!-- Before -->
<div v-for="service in services" :key="service.id">

<!-- After -->
<div v-for="service in services" :key="`${service.matterId}-${service.catalogId}`">
```

---

### Price Display

**Problem:** `service.fee` (engagement-specific) vs `service.price` (from catalog)

**Before:**
```typescript
service.fee  // Actual fee charged for this engagement
```

**After:**
```typescript
service.price  // Standard price from catalog
```

**Note:** If you need per-engagement pricing overrides, this would require:
1. Adding a `fee_override` column to `matters_to_services`
2. Or tracking in a separate pricing adjustments table

**Current behavior:** All engagements use catalog price

---

### Timestamp Names

**Before:**
```typescript
service.createdAt  // When service was created
```

**After:**
```typescript
service.engagedAt  // When service was engaged
service.startDate  // When service work started (optional)
service.endDate    // When service was completed (optional)
```

---

## API Response Changes

### GET /api/matters/[id]/services

**Before:**
```json
{
  "services": [
    {
      "id": "service-123",
      "matterId": "matter-456",
      "catalogId": "catalog-wydapt",
      "fee": 1500000,
      "status": "ACTIVE",
      "name": "WYDAPT"
    }
  ]
}
```

**After:**
```json
{
  "services": [
    {
      "matterId": "matter-456",
      "catalogId": "catalog-wydapt",
      "status": "ACTIVE",
      "engagedAt": "2024-01-15T10:30:00Z",
      "startDate": null,
      "endDate": null,
      "assignedAttorneyId": "atty-789",
      "name": "WYDAPT",
      "description": "Wyoming Domestic Asset Protection Trust",
      "price": 1500000,
      "category": "Trust Formation",
      "type": "SINGLE"
    }
  ]
}
```

### POST /api/matters/[id]/services

**Before request:**
```json
{
  "catalogId": "catalog-wydapt",
  "fee": 15000  // Optional override in dollars
}
```

**After request:**
```json
{
  "catalogId": "catalog-wydapt",
  "assignedAttorneyId": "atty-789"  // Optional
}
```

**Before response:**
```json
{
  "success": true,
  "service": { "id": "...", ... }
}
```

**After response:**
```json
{
  "success": true,
  "engagement": { "matterId": "...", "catalogId": "...", ... }
}
```

---

## Testing Checklist

### Matters Page (`/dashboard/cases`)
- [ ] Can view list of matters
- [ ] Can create new matter
- [ ] Can edit existing matter
- [ ] Can view services for a matter
- [ ] Can add service to matter
- [ ] Services display correctly (name, price, status)
- [ ] No console errors with composite keys

### Client Detail Page (`/dashboard/clients/[id]`)
- [ ] Client journeys display correctly
- [ ] Journey shows matter information
- [ ] Journey progress displays correctly
- [ ] No console errors

### Package Selection (if exists)
- [ ] Can select packages for an engagement
- [ ] Packages reference correct matter and catalog
- [ ] No orphaned serviceId references

### Payments (if exists)
- [ ] Payments tracked at matter level
- [ ] Can view all payments for a matter
- [ ] Payment totals calculate correctly
- [ ] No references to old servicePayments

---

## Migration Steps for UI

### Step 1: Update matters page
```bash
# File: app/pages/dashboard/cases/index.vue
# Lines: 135-140 (service display)
# Change: Use composite key, display price instead of fee
```

### Step 2: Test client journeys
```bash
# File: app/pages/dashboard/clients/[id].vue
# Should work without changes, but test thoroughly
```

### Step 3: Update package selection (if exists)
```bash
# Search for: serviceId references in package selection
# Update to: matterId + catalogId
```

### Step 4: Update payment UI (if exists)
```bash
# Search for: servicePayments, service.payment
# Update to: matter-level payment tracking
```

---

## Benefits for Users

1. **Clearer service association**: Services are clearly tied to matters (engagements)
2. **Simplified payment tracking**: All payments for an engagement in one place
3. **Better audit trail**: `engagedAt`, `startDate`, `endDate` provide clear timeline
4. **Flexible assignment**: Can assign different attorneys per service within a matter
5. **No duplicate fees**: Catalog price is source of truth, no per-service overrides to manage

---

## Rollback Considerations

If issues arise, the `services` table still exists with data. To rollback:

1. Re-point UI to old `services` endpoints
2. Restore old API endpoint code from git
3. Keep using `services` table temporarily
4. Debug issues with new structure
5. Re-apply when ready

The migration is **non-destructive** - old data is preserved.

---

## Questions to Consider

1. **Do we need per-engagement pricing overrides?**
   - Currently: All engagements use catalog price
   - Future: Add `fee_override` field to `matters_to_services`?

2. **Should we show engagement history?**
   - Track when service was engaged, started, completed
   - Display timeline in UI

3. **How to handle maintenance renewals?**
   - Maintenance packages are recurring
   - Should they create new engagements periodically?
   - Or track as ongoing in single engagement?

4. **Payment splits across services?**
   - If matter has WYDAPT + Maintenance
   - How to allocate payments between them?
   - Or just track total at matter level?
