# Domain Model Migration Implementation Summary

**Date:** January 2026
**Status:** Migration created, ready for review and deployment

---

## Changes Implemented

### 1. Database Migration Created

**File:** `/server/database/migrations/0011_restructure_services_to_junction.sql`

**Key Changes:**
- ✅ Created `matters_to_services` junction table with composite PK `(matter_id, catalog_id)`
- ✅ Created `payments` table (matter-level) to replace `service_payments`
- ✅ Added `matter_id` and `catalog_id` columns to `client_journeys`
- ✅ Added `matter_id` and `catalog_id` columns to `client_selected_packages`
- ✅ Migrated existing data from `services` to `matters_to_services`
- ✅ Migrated existing data from `service_payments` to `payments`
- ✅ Created indexes for performance
- ✅ Dropped `service_payments` table
- ⚠️ Kept `services` table temporarily for gradual migration

---

### 2. Schema Updates

**File:** `/server/database/schema.ts`

**New Tables:**
```typescript
// Junction table for many-to-many relationship
export const mattersToServices = sqliteTable('matters_to_services', {
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  catalogId: text('catalog_id').notNull().references(() => serviceCatalog.id, { onDelete: 'cascade' }),
  engagedAt: integer('engaged_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  assignedAttorneyId: text('assigned_attorney_id').references(() => users.id),
  status: text('status', { enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }).notNull().default('PENDING'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' })
}, (table) => ({
  pk: primaryKey({ columns: [table.matterId, table.catalogId] })
}))

// Matter-level payments
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  paymentType: text('payment_type', { enum: ['CONSULTATION', 'DEPOSIT_50', 'FINAL_50', 'MAINTENANCE', 'CUSTOM'] }).notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method', { enum: ['LAWPAY', 'CHECK', 'WIRE', 'CREDIT_CARD', 'ACH', 'OTHER'] }),
  lawpayTransactionId: text('lawpay_transaction_id'),
  status: text('status', { enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] }).notNull().default('PENDING'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
```

**Updated Tables:**
- `clientJourneys` - Added `matter_id`, `catalog_id`, composite FK to `matters_to_services`
- `clientSelectedPackages` - Added `matter_id`, `catalog_id`, composite FK to `matters_to_services`

**Removed:**
- `servicePayments` table definition (replaced by `payments`)

---

### 3. API Endpoints Updated

**File:** `/server/api/matters/[id]/services.get.ts`
- Changed from querying `services` table to `mattersToServices` junction
- Returns engagement data with service catalog details
- No breaking changes to response format

**File:** `/server/api/matters/[id]/services.post.ts`
- Changed from inserting into `services` to `mattersToServices`
- Removed `fee` parameter (payments now tracked separately)
- Added validation to prevent duplicate engagements
- Returns `engagement` object instead of `service`

**File:** `/server/api/client-journeys/client/[clientId].get.ts`
- Fixed SQL error by adding proper joins to `matters` table
- Added `matter_title` and `matter_number` to response

---

## New Domain Model Structure

```
Client (users table)
  ↓ 1:many
Matter (matters table) ← engagement/SOW
  ↓ many:many (via matters_to_services)
Service Catalog (service_catalog table) ← product definitions
  ↓ 1:1
Journey (journeys table) ← workflow template
  ↓ 1:many
Journey Steps (journey_steps table)

Client Journey (client_journeys table)
  ↓ references
Matter + Catalog (matters_to_services) ← engagement via composite FK
  ↓ tracks progress through
Journey Steps
```

---

## Benefits of New Structure

1. **Clearer Relationships**: Matter ↔ Service Catalog is explicit many-to-many
2. **Simpler Payment Tracking**: All payments at matter level (one place to look)
3. **Better Queries**: Composite FK ensures referential integrity
4. **Eliminates Redundancy**: One engagement record instead of separate service instances
5. **Matches Business Model**: "Matter is the unit of sales" - services are what's delivered within that engagement

---

## Migration Steps

### To Apply Migration:

```bash
# Run the migration (will be applied automatically by NuxHub/D1)
pnpm run db:migrate

# Or manually apply to local database:
wrangler d1 execute DB_NAME --local --file=server/database/migrations/0011_restructure_services_to_junction.sql
```

### Post-Migration Verification:

1. Check that `matters_to_services` table exists:
   ```sql
   SELECT * FROM matters_to_services LIMIT 5;
   ```

2. Check that `payments` table exists:
   ```sql
   SELECT * FROM payments LIMIT 5;
   ```

3. Check that `client_journeys` has new columns:
   ```sql
   SELECT matter_id, catalog_id FROM client_journeys LIMIT 5;
   ```

4. Verify data migration succeeded:
   ```sql
   -- Check count matches
   SELECT COUNT(*) FROM services WHERE parent_service_id IS NULL;
   SELECT COUNT(*) FROM matters_to_services;
   ```

---

## Remaining Work

### Critical Path:
1. ✅ Migration file created
2. ✅ Schema updated
3. ✅ Core API endpoints updated (`/matters/[id]/services.*`)
4. ✅ Client journeys endpoint fixed
5. ⏳ **Test migration with existing data**
6. ⏳ **Update remaining API endpoints that reference `services`**
7. ⏳ **Update UI components that display services data**
8. ⏳ **Drop `services` table once all code is migrated**

### To Find Remaining References:

```bash
# Search for services table usage in API endpoints
grep -r "schema.services" server/api/

# Search for services references in pages
grep -r "services" app/pages/ --include="*.vue"

# Search for services in composables
grep -r "services" composables/ --include="*.ts"
```

---

## Testing Checklist

- [ ] Migration runs without errors
- [ ] Data is correctly migrated from `services` to `matters_to_services`
- [ ] Payments data is correctly migrated to new `payments` table
- [ ] Client journeys link correctly to engagements
- [ ] Can add new service to matter via API
- [ ] Can fetch services for matter via API
- [ ] Client journey queries work correctly
- [ ] No broken foreign key constraints
- [ ] UI displays services correctly
- [ ] Can track payments at matter level

---

## Rollback Plan

If issues arise, rollback by:

1. Restore previous migration state:
   ```bash
   # This will vary based on your deployment strategy
   wrangler d1 time-travel restore <DATABASE_NAME> --timestamp=<BEFORE_MIGRATION>
   ```

2. Revert schema.ts changes:
   ```bash
   git checkout HEAD~1 server/database/schema.ts
   ```

3. Revert API endpoint changes:
   ```bash
   git checkout HEAD~1 server/api/matters/[id]/services.*
   ```

---

## Notes

- The `services` table is kept temporarily to allow gradual migration
- Once all code is updated, create a follow-up migration to drop `services` table
- Payment system may need further refinement based on business requirements
- Consider adding audit logging for engagement status changes
