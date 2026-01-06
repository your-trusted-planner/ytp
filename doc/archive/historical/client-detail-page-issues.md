# Client Detail Page - Domain Model Alignment Issues

## Current File
`/app/pages/dashboard/clients/[id].vue`

---

## Problems with Current Implementation

### 1. **Missing Matter Context** ❌

**Current Behavior:**
- Shows "Active Journeys" directly on the client
- No mention or display of matters

**Domain Model Reality:**
- **Matters** are the primary unit of client engagement
- Services are engaged **within** matters via `matters_to_services` junction
- Client journeys reference `(matter_id, catalog_id)` composite FK
- All client activity should be organized by matter

**Impact:** Users can't see which matter a journey belongs to, making it impossible to understand the full engagement context.

---

### 2. **Broken Start Journey Workflow** ❌

**Current Modal (Lines 176-201):**
```vue
<UiSelect v-model="selectedJourneyId" label="Select Journey *" required>
  <option v-for="journey in availableJourneys">...</option>
</UiSelect>

<UiSelect v-model="journeyPriority" label="Priority">
  <option value="MEDIUM">Medium</option>
</UiSelect>
```

**Missing Required Fields:**
- ❌ Matter selection
- ❌ Service selection (which engaged service in the matter)
- ❌ Validation that `(matter_id, catalog_id)` exists in `matters_to_services`

**What Happens:**
The API call (lines 373-380) sends:
```typescript
{
  clientId: clientId,
  journeyId: selectedJourneyId.value,
  priority: journeyPriority.value
  // Missing: matterId, catalogId
}
```

This violates the foreign key constraint:
```typescript
foreignKey({
  columns: [table.matterId, table.catalogId],
  foreignColumns: [mattersToServices.matterId, mattersToServices.catalogId]
})
```

**Result:** Either the journey creation fails, or it creates orphan journeys without proper matter/service linkage.

---

### 3. **Incorrect Quick Stats** ❌

**Current Stats (Lines 69-85):**
```typescript
- Active Journeys: {{ activeJourneys }}
- Documents: {{ totalDocuments }}
- Appointments: {{ totalAppointments }}
```

**Should Show:**
- ✅ **Active Matters** (OPEN/IN_PROGRESS status)
- ✅ **Total Services Engaged** (across all matters)
- ✅ **Payment Status** (total paid, total outstanding)
- ✅ **Active Journeys** (grouped by matter)

**Rationale:**
- Matters are the business unit, not journeys
- Lawyers need to see engagement scope (services) and financials (payments)
- Documents and appointments are less critical for quick overview

---

### 4. **No Matter Management** ❌

**Current:**
- No section showing client's matters
- No way to view matter details
- No way to create new matters from client page

**Domain Model:**
- Matters are the **primary unit of sales**
- All services, journeys, and payments are scoped to matters
- Client page should prominently show matters

**Missing UI:**
- List of client's matters with:
  - Matter number (e.g., "2024-001")
  - Title (e.g., "Smith Family Trust 2024")
  - Status badge (PENDING, OPEN, CLOSED)
  - Engaged services count
  - Payment status
  - Active journeys count
  - "View Details" button → links to matter detail page

---

### 5. **Document Context Missing** ⚠️

**Current (Line 127):**
Shows "Recent Documents" at client level

**Domain Model:**
Documents should be linked to **matters**, not directly to clients

**Fix:**
- Show documents grouped by matter
- Each document should show which matter it belongs to
- Alternative: Show across all matters but include matter context

---

## Proposed Restructuring

### Layout Changes

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Client Name, Email, Status, [Edit] [Create Matter] │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────────────────────────┐
│ Contact Info     │  │ Active Matters (Primary Section)    │
│ - Name           │  │ ┌──────────────────────────────────┐ │
│ - Email          │  │ │ Matter: Smith Trust 2024         │ │
│ - Phone          │  │ │ #2024-001 • OPEN                 │ │
│ - Address        │  │ │ ─────────────────────────────────│ │
│                  │  │ │ Services: 2 • Journeys: 1        │ │
│ Quick Stats      │  │ │ Payments: $5,000 / $7,000        │ │
│ - Active Matters │  │ │ [View Details]                   │ │
│ - Services       │  │ └──────────────────────────────────┘ │
│ - Payments       │  │                                      │
└──────────────────┘  │ ┌──────────────────────────────────┐ │
                      │ │ Matter: Estate Planning 2024     │ │
                      │ │ #2024-002 • PENDING              │ │
                      │ │ ...                              │ │
                      │ └──────────────────────────────────┘ │
                      └──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Active Journeys (Grouped by Matter)                          │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Matter: Smith Trust 2024 (#2024-001)                   │   │
│ │ Service: WYDAPT                                        │   │
│ │ Journey: Wyoming Trust Formation                       │   │
│ │ Step: Homework Assigned (IN_PROGRESS)                  │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Notes                                                         │
└──────────────────────────────────────────────────────────────┘
```

---

### New Start Journey Modal Workflow

**Step 1: Select Matter**
```vue
<UiSelect v-model="selectedMatterId" label="Select Matter *" required>
  <option v-for="matter in clientMatters" :value="matter.id">
    {{ matter.title }} (#{{ matter.matter_number }})
  </option>
</UiSelect>
```

**Step 2: Select Engaged Service** (auto-populated based on matter)
```vue
<UiSelect v-model="selectedCatalogId" label="Select Service *" required>
  <option v-for="service in engagedServices" :value="service.catalog_id">
    {{ service.name }}
  </option>
</UiSelect>
```

**Step 3: Journey Template** (auto-populated based on service)
```vue
<UiSelect v-model="selectedJourneyId" label="Journey Template" disabled>
  <option :value="associatedJourney.id" selected>
    {{ associatedJourney.name }}
  </option>
</UiSelect>
<p class="text-xs text-gray-600">
  This service uses the "{{ associatedJourney.name }}" workflow
</p>
```

**Step 4: Priority**
```vue
<UiSelect v-model="journeyPriority" label="Priority">
  <option value="MEDIUM">Medium</option>
  ...
</UiSelect>
```

**API Call:**
```typescript
await $fetch('/api/client-journeys', {
  method: 'POST',
  body: {
    clientId: clientId,
    matterId: selectedMatterId.value,        // NEW
    catalogId: selectedCatalogId.value,      // NEW
    journeyId: selectedJourneyId.value,
    priority: journeyPriority.value
  }
})
```

**Validation:**
- Verify `(matterId, catalogId)` exists in `matters_to_services` before creating journey
- Prevent duplicate journeys for the same engagement

---

## Required Changes

### 1. Update Page Layout

**File:** `/app/pages/dashboard/clients/[id].vue`

**Changes:**
- Add "Active Matters" section as primary content (replace or reorder journeys section)
- Update quick stats to show matters, services, payments
- Add "Create Matter" button in header
- Update journeys section to group by matter and show context

### 2. Update Data Fetching

**New Endpoint Needed:**
```typescript
GET /api/clients/[id]/matters
// Returns all matters for this client with aggregated stats
```

**Response:**
```typescript
{
  matters: [
    {
      id: '...',
      matter_number: '2024-001',
      title: 'Smith Family Trust 2024',
      status: 'OPEN',
      services_count: 2,
      active_journeys_count: 1,
      total_paid: 5000,
      total_expected: 7000,
      engaged_services: [
        { catalog_id: '...', name: 'WYDAPT', status: 'ACTIVE' },
        { catalog_id: '...', name: 'Maintenance', status: 'PENDING' }
      ]
    }
  ]
}
```

### 3. Update Start Journey Modal

**Changes:**
- Add matter selection dropdown
- Add service selection dropdown (filtered by selected matter)
- Journey template auto-selected based on service
- Add validation before submission
- Update API call to include `matterId` and `catalogId`

### 4. Update Quick Stats

**Queries:**
```typescript
const activeMatters = clientMatters.filter(m => ['OPEN', 'IN_PROGRESS'].includes(m.status))
const totalServices = clientMatters.reduce((sum, m) => sum + m.services_count, 0)
const totalPaid = clientMatters.reduce((sum, m) => sum + m.total_paid, 0)
const totalExpected = clientMatters.reduce((sum, m) => sum + m.total_expected, 0)
```

### 5. Update Active Journeys Display

**Add matter context to each journey:**
```vue
<div v-for="journey in journeys">
  <div class="text-xs text-gray-600">
    Matter: {{ journey.matter_title }} (#{{ journey.matter_number }})
  </div>
  <div class="text-xs text-gray-600">
    Service: {{ journey.service_name }}
  </div>
  <h4>{{ journey.journey_name }}</h4>
  <p>Current: {{ journey.current_step_name }}</p>
</div>
```

---

## API Endpoint Changes

### New Endpoint: Get Client Matters

**File:** `/server/api/clients/[id]/matters.get.ts`

```typescript
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')

  const db = hubDatabase()

  const matters = await db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
      (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid,
      (SELECT COALESCE(SUM(sc.price), 0) FROM matters_to_services mts JOIN service_catalog sc ON mts.catalog_id = sc.id WHERE mts.matter_id = m.id) as total_expected
    FROM matters m
    WHERE m.client_id = ?
    ORDER BY m.created_at DESC
  `).bind(clientId).all()

  return { matters: matters.results || [] }
})
```

### Update Endpoint: Get Client Journeys

**File:** `/server/api/client-journeys/client/[clientId].get.ts`

**Add matter context to query:**
```sql
SELECT
  cj.*,
  j.name as journey_name,
  js.name as current_step_name,
  sc.name as service_name,
  m.title as matter_title,
  m.matter_number
FROM client_journeys cj
JOIN journeys j ON cj.journey_id = j.id
LEFT JOIN journey_steps js ON cj.current_step_id = js.id
LEFT JOIN service_catalog sc ON cj.catalog_id = sc.id
LEFT JOIN matters m ON cj.matter_id = m.id
WHERE cj.client_id = ?
```

### Update Endpoint: Create Client Journey

**File:** `/server/api/client-journeys/index.post.ts`

**Add validation:**
```typescript
// Validate that the engagement exists
if (body.matterId && body.catalogId) {
  const engagement = await db.prepare(`
    SELECT * FROM matters_to_services
    WHERE matter_id = ? AND catalog_id = ?
  `).bind(body.matterId, body.catalogId).first()

  if (!engagement) {
    throw createError({
      statusCode: 400,
      message: 'This service is not engaged for the selected matter'
    })
  }
}

// Create journey with matter and catalog references
const journey = {
  id: nanoid(),
  client_id: body.clientId,
  matter_id: body.matterId,      // NEW
  catalog_id: body.catalogId,    // NEW
  journey_id: body.journeyId,
  priority: body.priority || 'MEDIUM',
  status: 'NOT_STARTED',
  created_at: Date.now(),
  updated_at: Date.now()
}
```

---

## Migration Path

### Phase 1: Add Matter Section
- Create `/api/clients/[id]/matters` endpoint
- Add "Active Matters" card to client detail page
- Update quick stats

### Phase 2: Update Journey Display
- Update journey queries to include matter context
- Modify journey cards to show matter and service info
- Group journeys by matter

### Phase 3: Fix Start Journey Modal
- Add matter selection
- Add service selection (filtered by matter)
- Update API call with composite FK
- Add validation

### Phase 4: Polish
- Add "Create Matter" flow from client page
- Add matter quick actions
- Improve visual hierarchy

---

## Success Criteria

✅ Client page shows all active matters prominently
✅ Quick stats reflect matter-level metrics
✅ Starting a journey requires matter and service selection
✅ All journeys display their matter context
✅ Composite FK `(matter_id, catalog_id)` is always valid
✅ No orphan journeys without proper matter linkage

---

## References

- [Domain Model Restructuring](./domain-model-restructuring.md)
- [Matter Detail Page Implementation Plan](../../.claude/plans/lexical-plotting-wadler.md) (Phase 2)
- Database schema: `matters_to_services`, `client_journeys`, `payments`
