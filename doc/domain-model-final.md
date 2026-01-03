# Domain Model - Final Design

**Date:** January 2026
**Status:** Agreed model for implementation

---

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ matters : "has"
    users {
        string id PK
        string email
        string role
        string firstName
        string lastName
        string status
    }

    matters ||--o{ matters_to_services : "engages"
    matters {
        string id PK
        string clientId FK
        string title
        string matterNumber
        string description
        string status
        string assignedAttorneyId FK
        timestamp contractDate
    }

    service_catalog ||--o{ matters_to_services : "engaged_in"
    service_catalog ||--|| journeys : "has_workflow"
    service_catalog {
        string id PK
        string name
        string description
        string category
        string type
        integer price
        integer consultationFee
        boolean consultationFeeEnabled
        string engagementLetterId FK
        boolean isActive
    }

    matters_to_services {
        string matterId FK
        string catalogId FK
        timestamp engagedAt
        PK matterId_catalogId
    }

    journeys ||--o{ journey_steps : "contains"
    journeys ||--o{ client_journeys : "instantiated_as"
    journeys {
        string id PK
        string serviceCatalogId FK
        string name
        string description
        boolean isTemplate
        boolean isActive
        integer estimatedDurationDays
    }

    journey_steps {
        string id PK
        string journeyId FK
        string stepType
        string name
        string description
        integer stepOrder
        string responsibleParty
        integer expectedDurationDays
        string helpContent
        boolean allowMultipleIterations
    }

    matters ||--o{ client_journeys : "has_progress"
    client_journeys ||--|| journey_steps : "at_step"
    client_journeys {
        string id PK
        string clientId FK
        string matterId FK
        string catalogId FK
        string journeyId FK
        string currentStepId FK
        string status
        string priority
        timestamp startedAt
        timestamp completedAt
        timestamp pausedAt
    }

    matters ||--o{ payments : "has_payments"
    payments {
        string id PK
        string matterId FK
        string paymentType
        integer amount
        string paymentMethod
        string status
        timestamp paidAt
        string lawpayTransactionId
    }
```

---

## Key Relationships

### 1. Client → Matter (1:many)
```
Client "Smith Family"
  └── Matter "Smith Family Trust 2024"
```
- One client can have multiple matters (different engagements over time)
- Each matter belongs to one client

---

### 2. Matter → Service Catalog (many:many via junction)
```
Matter "Smith Family Trust 2024"
  ├── service_catalog "WYDAPT" (via matters_to_services)
  └── service_catalog "Annual Maintenance" (via matters_to_services)
```
- One matter can engage multiple services
- One service (catalog item) can be engaged in multiple matters (by different clients)
- Junction table: `matters_to_services` with composite PK `(matterId, catalogId)`

---

### 3. Service Catalog → Journey (1:1)
```
service_catalog "WYDAPT"
  └── journey "WYDAPT Formation Workflow"
```
- Each product in the catalog has exactly one workflow
- Journey is defined at the product level (all WYDAPT clients follow same workflow)

---

### 4. Matter + Catalog → client_journey (progress tracking)
```
Matter "Smith Family Trust 2024" + service_catalog "WYDAPT"
  → matters_to_services (engagement record)
    → client_journey (tracks progress through WYDAPT workflow)
      └── currentStepId (where they are in the journey)
```
- Each engagement (matter + catalog) has one client_journey tracking progress
- client_journey references: `(matterId, catalogId)` identifies the engagement
- client_journey also references: `journeyId` (the workflow being followed)

---

### 5. Matter → Payments (1:many)
```
Matter "Smith Family Trust 2024"
  ├── Payment: Consultation Fee ($375)
  ├── Payment: 50% Deposit ($7,500)
  └── Payment: Final 50% ($7,500)
```
- Payments tracked at matter level (not per-service)
- Separate `payments` table handles complexity
- One matter can have multiple payments (installments, fees, etc.)

---

## Composite Primary Key: matters_to_services

**Schema Definition:**
```sql
CREATE TABLE matters_to_services (
  matter_id TEXT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  catalog_id TEXT NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  engaged_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (matter_id, catalog_id)
);
```

**Drizzle Schema:**
```typescript
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
```

---

## client_journeys References

**With Composite FK:**
```typescript
export const clientJourneys = sqliteTable('client_journeys', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id),
  matterId: text('matter_id').notNull(),
  catalogId: text('catalog_id').notNull(),
  journeyId: text('journey_id').notNull().references(() => journeys.id),
  currentStepId: text('current_step_id').references(() => journeySteps.id),
  status: text('status', {
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED']
  }).notNull().default('NOT_STARTED'),
  priority: text('priority', {
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  }).notNull().default('MEDIUM'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  pausedAt: integer('paused_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  // Composite foreign key to matters_to_services
  engagementFk: foreignKey({
    columns: [table.matterId, table.catalogId],
    foreignColumns: [mattersToServices.matterId, mattersToServices.catalogId]
  })
}))
```

---

## Example Data Flow

### Scenario: Smith family engages WYDAPT

**1. Client exists:**
```
users {
  id: "client-123",
  email: "smith@example.com",
  role: "CLIENT"
}
```

**2. Matter created:**
```
matters {
  id: "matter-456",
  clientId: "client-123",
  title: "Smith Family Trust 2024",
  matterNumber: "2024-001",
  status: "OPEN",
  assignedAttorneyId: "attorney-789"
}
```

**3. Service engaged (junction record):**
```
matters_to_services {
  matterId: "matter-456",
  catalogId: "catalog-wydapt",
  engagedAt: 1704067200
}
```

**4. Payment(s) made:**
```
payments {
  id: "payment-111",
  matterId: "matter-456",
  paymentType: "CONSULTATION",
  amount: 37500,
  status: "COMPLETED"
}

payments {
  id: "payment-222",
  matterId: "matter-456",
  paymentType: "DEPOSIT_50",
  amount: 750000,
  status: "PENDING"
}
```

**5. Client journey instantiated:**
```
client_journeys {
  id: "cj-999",
  clientId: "client-123",
  matterId: "matter-456",
  catalogId: "catalog-wydapt",
  journeyId: "journey-wydapt-v1",
  currentStepId: "step-1",
  status: "IN_PROGRESS"
}
```

---

## Query Examples

### Get all services for a matter:
```sql
SELECT sc.*
FROM matters_to_services mts
JOIN service_catalog sc ON mts.catalog_id = sc.id
WHERE mts.matter_id = ?
```

### Get client's journey progress:
```sql
SELECT
  cj.*,
  j.name as journey_name,
  js.name as current_step_name,
  sc.name as service_name
FROM client_journeys cj
JOIN journeys j ON cj.journey_id = j.id
JOIN journey_steps js ON cj.current_step_id = js.id
JOIN service_catalog sc ON cj.catalog_id = sc.id
WHERE cj.matter_id = ? AND cj.client_id = ?
```

### Get all payments for a matter:
```sql
SELECT *
FROM payments
WHERE matter_id = ?
ORDER BY created_at ASC
```

---

## Migration Strategy

### Phase 1: Create new tables
1. Create `matters_to_services` junction table
2. Create `payments` table (separate design doc)
3. Add `matterId` and `catalogId` to `client_journeys`

### Phase 2: Migrate data
1. Migrate `services` → `matters_to_services` (extract matterId + catalogId)
2. Migrate payment data from `services` → `payments`
3. Update `client_journeys` to reference (matterId, catalogId)

### Phase 3: Clean up
1. Drop `services` table
2. Remove old payment fields
3. Update all queries and APIs

---

## Open Questions

### Q1: Should service_catalog link to journey?
Currently: `journeys.serviceCatalogId` → `service_catalog`
This makes journey the child of service_catalog.

Alternative: Add `journeyId` to `service_catalog`?
This would make it bidirectional or reverse the relationship.

**Recommendation:** Keep current design - journey belongs to service_catalog

---

### Q2: Unique constraint on client_journeys?
Should we enforce: One client_journey per engagement?

```sql
UNIQUE (matter_id, catalog_id)
```

Or can a client restart/retry a journey (multiple attempts)?

**Recommendation:** Add unique constraint - one journey per engagement

---

### Q3: Payment complexity
User noted: "Payments are a whole other ball of wax"

Next step: Design payment system separately
- Payment schedules
- Installments
- Refunds
- Multiple payment methods
- Payment gating for journey progression

**Action:** Create separate payment system design doc

---

## Implementation Status

**Migration Created:** `/server/database/migrations/0011_restructure_services_to_junction.sql`

**Schema Updated:** `/server/database/schema.ts` now includes:
- ✅ `mattersToServices` junction table with composite PK `(matter_id, catalog_id)`
- ✅ `payments` table (matter-level) replacing `servicePayments`
- ✅ `clientJourneys` updated with `matter_id` and `catalog_id` columns
- ✅ Composite foreign key from `clientJourneys` to `mattersToServices`
- ✅ `clientSelectedPackages` updated with `matter_id` and `catalog_id` columns
- ⚠️ `services` table kept temporarily for backward compatibility during migration

**API Endpoints Updated:**
- ✅ `/server/api/client-journeys/client/[clientId].get.ts` - Fixed SQL query to use new relationships

**Remaining Work:**
1. Update all API endpoints that reference `services` table to use `mattersToServices`
2. Update UI components that fetch/display services data
3. Test the migration with existing data
4. Remove `services` table once all code is migrated
5. Design comprehensive payment system (separate from this migration)

---

## Summary

**Key Changes from Previous Design:**

1. ✅ Remove `services` table
2. ✅ Add `matters_to_services` junction (many:many)
3. ✅ Payments at matter level (separate table)
4. ✅ Service catalog directly defines workflow
5. ✅ client_journeys references engagement via (matterId, catalogId)

**Result:** Simpler, clearer model where:
- Matter = the engagement/SOW
- matters_to_services = which services are in scope
- client_journeys = progress tracking
- payments = financial transactions (complex, separate system)
