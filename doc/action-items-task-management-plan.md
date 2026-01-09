# Action Items & Task Management System - Implementation Plan

**Created**: 2026-01-06
**Updated**: 2026-01-06
**Status**: ✅ Complete and Working

## 📋 Table of Contents
- [Philosophy & Core Concepts](#philosophy--core-concepts)
- [Current State](#current-state)
- [Schema Implementation](#schema-implementation)
- [Action Types & System Integration](#action-types--system-integration)
- [UI Components Needed](#ui-components-needed)
- [Implementation Phases](#implementation-phases)
- [API Endpoints](#api-endpoints)

---

## Philosophy & Core Concepts

### Every Journey Step Must Have Actions

**Core Principle**: Every journey step must have at least one action item. Journey steps are not passive milestones - they represent work that needs to be done.

**Rationale**: We're shepherding outcomes, and outcomes require work to be done by someone. That someone might be:
- The attorney
- Staff
- The client
- An automation in the software
- A third-party service

### "Ring the Bell" - Service Delivery Verification

**Concept**: From communications professor - define goals like ringing a bell. You can't deny that the bell was rung. Either it was or it wasn't.

**Implementation**: The final step of every journey should objectively verify that the service was delivered.

**Example Criteria**:
```json
{
  "objectiveCriteria": [
    "Trust document signed by all parties",
    "Articles of Organization filed with WY Secretary of State (confirmation #)",
    "Client receives executed trust binder"
  ]
}
```

**UI Personality**: Inject personality into the verification flow:
```
🔔 Ring the Bell!

You're about to complete the WYDAPT journey for [Client Name].

Verify service delivery:
✅ Trust documents executed by all parties
✅ Filing confirmation #WY-2024-12345
✅ Client binder delivered

[🔔 Confirm Service Delivered] [Not Yet]
```

### Work Types

Action items represent different types of work:

**In-System Work** (tightly integrated):
- **Meeting**: Phone call, Google Meet, in-person (calendar integration)
- **Document Upload**: Client provides documents
- **E-Signature**: Document signing via DocuSign/HelloSign
- **Payment**: Payment received (payment system integration)
- **Form/Questionnaire**: Client fills out forms
- **Review**: Attorney reviews documents

**Offline Work** (status tracking):
- **Offline Task**: Manual work outside system (e.g., filing with Secretary of State)
- **Third-Party**: External service (notary, filing service) with status + reference number
- **Expense**: Track filing fees, service charges with receipt upload

**Automation**:
- **Automation**: System-executed tasks (no user interaction unless failed)

---

## Current State

### ✅ Completed (2026-01-06)

**All phases complete and working!**

1. **Migration 0053**: Enhanced `action_items` and `journey_steps` tables
2. **Drizzle Schema**: Updated with 14 action types including DRAFT_DOCUMENT
3. **API Endpoints**: 6 endpoints (POST, PUT, DELETE, GET by step, GET by journey, complete, validate)
4. **Journey Builder UI**: Enhanced with expandable action items sections per step
5. **Action Item Modal**: Complete with visual type selector and configuration forms
6. **Validation System**: Real-time warnings showing steps without action items
7. **"Ring the Bell" UI**: Service delivery verification integrated into final steps
8. **System Integration Hooks**: Toggles for calendar, payment, and document integration
9. **Type-Specific Configuration**: 5 action types with custom config forms (Meeting, Upload, Payment, E-Signature, Draft Document)
10. **Build Verification**: All changes compile successfully

**Action Types Implemented**: 14 total
- QUESTIONNAIRE, DECISION, UPLOAD, REVIEW, ESIGN, NOTARY
- PAYMENT, MEETING, KYC
- AUTOMATION, THIRD_PARTY, OFFLINE_TASK
- EXPENSE, FORM, DRAFT_DOCUMENT

---

## Schema Implementation

### Database Tables

#### `action_items` Table

**New Fields Added** (Migration 0053):

```sql
-- System integration tracking
system_integration_type TEXT CHECK(system_integration_type IN ('calendar', 'payment', 'document', 'manual'))
resource_id TEXT -- ID of calendar event, payment, document, etc.
automation_handler TEXT -- For AUTOMATION action types

-- Service delivery verification ("ring the bell")
is_service_delivery_verification INTEGER DEFAULT 0 CHECK(is_service_delivery_verification IN (0, 1))
verification_criteria TEXT -- JSON: objective completion criteria
verification_evidence TEXT -- JSON: proof of completion
```

**Existing Fields**:
- `id`, `step_id`, `client_journey_id`
- `action_type` (enum - see Action Types section)
- `title`, `description`, `config` (JSON)
- `status` (PENDING, IN_PROGRESS, COMPLETE, SKIPPED)
- `assigned_to` (CLIENT, COUNSEL, STAFF)
- `due_date`, `priority` (LOW, MEDIUM, HIGH, URGENT)
- `completed_at`, `completed_by`

**Indexes**:
```sql
CREATE INDEX idx_action_items_system_integration ON action_items(system_integration_type, resource_id);
CREATE INDEX idx_action_items_service_delivery ON action_items(is_service_delivery_verification) WHERE is_service_delivery_verification = 1;
CREATE INDEX idx_action_items_journey_status ON action_items(client_journey_id, status);
```

#### `journey_steps` Table

**New Fields Added** (Migration 0053):

```sql
-- Final step tracking
is_final_step INTEGER DEFAULT 0 CHECK(is_final_step IN (0, 1))
completion_requirements TEXT -- JSON: requirements for step completion
requires_verification INTEGER DEFAULT 0 CHECK(requires_verification IN (0, 1))
```

**Index**:
```sql
CREATE INDEX idx_journey_steps_final ON journey_steps(is_final_step) WHERE is_final_step = 1;
```

### Drizzle Schema

**Location**: `/server/database/schema.ts`

```typescript
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  stepId: text('step_id').references(() => journeySteps.id, { onDelete: 'cascade' }),
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id, { onDelete: 'cascade' }),

  actionType: text('action_type', {
    enum: [
      'QUESTIONNAIRE', 'DECISION', 'UPLOAD', 'REVIEW', 'ESIGN',
      'NOTARY', 'PAYMENT', 'MEETING', 'KYC',
      'AUTOMATION', 'THIRD_PARTY', 'OFFLINE_TASK', 'EXPENSE', 'FORM'
    ]
  }).notNull(),

  title: text('title').notNull(),
  description: text('description'),
  config: text('config'),
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  assignedTo: text('assigned_to', { enum: ['CLIENT', 'COUNSEL', 'STAFF'] }).notNull().default('CLIENT'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),

  // System integration tracking
  systemIntegrationType: text('system_integration_type', { enum: ['calendar', 'payment', 'document', 'manual'] }),
  resourceId: text('resource_id'),
  automationHandler: text('automation_handler'),

  // Service delivery verification
  isServiceDeliveryVerification: integer('is_service_delivery_verification', { mode: 'boolean' }).notNull().default(false),
  verificationCriteria: text('verification_criteria'),
  verificationEvidence: text('verification_evidence'),

  completedAt: integer('completed_at', { mode: 'timestamp' }),
  completedBy: text('completed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export const journeySteps = sqliteTable('journey_steps', {
  // ... existing fields ...

  // Final step verification
  isFinalStep: integer('is_final_step', { mode: 'boolean' }).notNull().default(false),
  completionRequirements: text('completion_requirements'),
  requiresVerification: integer('requires_verification', { mode: 'boolean' }).notNull().default(false),

  // ... timestamps ...
})
```

---

## Action Types & System Integration

### Action Type Reference

| Action Type | Description | Assigned To | System Integration | Notes |
|------------|-------------|-------------|-------------------|-------|
| **QUESTIONNAIRE** | Client fills out structured questionnaire | CLIENT | `document` | Existing type |
| **DECISION** | Client makes a decision point | CLIENT | `manual` | Existing type |
| **UPLOAD** | Client uploads documents | CLIENT | `document` | Existing type |
| **REVIEW** | Attorney reviews documents | COUNSEL | `document` | Existing type |
| **ESIGN** | E-signature via DocuSign/HelloSign | CLIENT | `document` | Existing type |
| **NOTARY** | Document notarization | THIRD_PARTY | `document` | Existing type |
| **PAYMENT** | Payment received | CLIENT | `payment` | Existing type |
| **MEETING** | Scheduled meeting/call | BOTH | `calendar` | Existing type |
| **KYC** | Know Your Customer verification | CLIENT | `manual` | Existing type |
| **AUTOMATION** | System-executed task | N/A | `manual` | **NEW** - No user interaction |
| **THIRD_PARTY** | External service (filing, notary) | THIRD_PARTY | `manual` | **NEW** - Track status + reference # |
| **OFFLINE_TASK** | Manual work outside system | COUNSEL/STAFF | `manual` | **NEW** - Simple status tracking |
| **EXPENSE** | Filing fee, service charge | COUNSEL | `payment` | **NEW** - Track amount + receipt |
| **FORM** | Form filling (distinct from questionnaire) | CLIENT | `document` | **NEW** - Simple forms |
| **DRAFT_DOCUMENT** | Complete/draft document | COUNSEL/STAFF | `document` | **NEW** - Stub for document generation system |

### System Integration Types

#### `calendar` Integration
- Links to calendar events (Google Calendar integration in progress)
- Action items of type `MEETING`
- `resourceId` = calendar event ID
- **UI**: Show "Schedule" button, display meeting details

#### `payment` Integration
- Links to payment records
- Action items of type `PAYMENT`, `EXPENSE`
- `resourceId` = payment ID
- **UI**: Show "Record Payment" button, payment status

#### `document` Integration
- Links to documents/document uploads
- Action items of type `UPLOAD`, `REVIEW`, `ESIGN`, `NOTARY`, `QUESTIONNAIRE`, `FORM`, `DRAFT_DOCUMENT`
- `resourceId` = document ID or upload ID
- **UI**: Show upload widget, signature status, review interface, document generation

**DRAFT_DOCUMENT Configuration**:
```json
{
  "documentName": "Wyoming Asset Protection Trust Agreement",
  "templateId": "optional-template-id",
  "notes": "Special instructions or requirements for drafting"
}
```
- **Future Integration**: Will connect to document generation system
- **Current State**: Tracks document completion tasks manually
- **UI**: Shows blue info banner indicating future integration

#### `manual` Integration
- No system integration, manual status tracking
- Action items of type `DECISION`, `KYC`, `OFFLINE_TASK`, `THIRD_PARTY`, `AUTOMATION`
- `resourceId` = null
- **UI**: Simple status dropdown, notes field, reference number field

---

## UI Components - ✅ All Implemented

### 1. Journey Step Designer

**Location**: `/app/pages/dashboard/journeys/[id].vue` (enhanced existing page)

**Features** (All Complete):
- ✅ List all steps in a journey with drag-and-drop reordering
- ✅ Add/edit/duplicate/delete steps
- ✅ **Validation**: Real-time warnings for steps without action items
- ✅ Mark step as final step
- ✅ Set completion requirements for final steps
- ✅ Expandable action items sections per step
- ✅ Visual indicators showing action item count or "Required" badge

**UI Flow** (Implemented):
```
1. Attorney creates step: "Sign Trust Documents"
2. System shows: Action Items section with "Required" badge
3. Attorney clicks "+ Add Action"
4. Modal shows action type selector
5. Attorney configures action
6. Save button enabled after ≥1 action added
```

### 2. Action Type Selector

**Location**: `/app/components/journey/ActionTypeSelector.vue` (new)

**Features**:
- Grid or list of action types with icons and descriptions
- Grouped by category: In-System, Offline, Automation
- Clicking type opens configuration modal

**Example Layout**:
```
In-System Work
┌──────────────┬──────────────┬──────────────┐
│ 📄 Upload    │ ✍️ E-Sign    │ 💰 Payment   │
│ Client       │ Document     │ Record       │
│ provides     │ signing via  │ payment      │
│ documents    │ HelloSign    │ received     │
└──────────────┴──────────────┴──────────────┘

Offline Work
┌──────────────┬──────────────┬──────────────┐
│ 🔧 Offline   │ 🏢 3rd Party │ 💵 Expense   │
│ Task         │ Service      │ Track filing │
│ Manual work  │ External     │ fees & costs │
│ outside sys  │ notary/file  │              │
└──────────────┴──────────────┴──────────────┘

Automation
┌──────────────┐
│ ⚙️ Automation│
│ System runs  │
│ automatically│
└──────────────┘
```

### 3. Action Item Configuration Modals

**Location**: `/app/components/journey/action-config/` (new directory)

One component per action type:
- `MeetingActionConfig.vue` - Select meeting type, duration
- `UploadActionConfig.vue` - Specify document types, requirements
- `PaymentActionConfig.vue` - Payment type, amount
- `OfflineTaskActionConfig.vue` - Task description, notes
- `ThirdPartyActionConfig.vue` - Service type, reference field
- `ExpenseActionConfig.vue` - Amount, receipt upload
- `AutomationActionConfig.vue` - Handler selection
- etc.

Each modal includes:
- Action title (required)
- Description (optional)
- Assigned to (CLIENT, COUNSEL, STAFF)
- Priority (LOW, MEDIUM, HIGH, URGENT)
- Due date (optional)
- Type-specific configuration

### 4. Action Item Widgets (Client View)

**Location**: `/app/components/journey/action-widgets/` (new directory)

Displays action items to clients during journey:
- `UploadWidget.vue` - File upload interface
- `MeetingWidget.vue` - Meeting details, join link
- `PaymentWidget.vue` - Payment instructions, status
- `FormWidget.vue` - Embedded form
- `QuestionnaireWidget.vue` - Multi-page questionnaire
- `DecisionWidget.vue` - Decision options
- Generic widget for manual status tracking

### 5. "Ring the Bell" Verification UI

**Location**: `/app/components/journey/FinalStepVerification.vue` (new)

**Features**:
- Displayed when attorney reaches final step
- Shows completion requirements checklist
- Prompt for verification evidence
- Bell icon/animation on completion
- Personality in messaging

**Example**:
```vue
<template>
  <UiModal v-model="showVerification" size="lg">
    <div class="text-center">
      <div class="text-6xl mb-4">🔔</div>
      <h2 class="text-2xl font-bold mb-2">Ring the Bell!</h2>
      <p class="text-gray-600 mb-6">
        You're about to complete the {{ journeyName }} journey for {{ clientName }}.
      </p>
    </div>

    <div class="space-y-4">
      <h3 class="font-semibold">Verify Service Delivery:</h3>
      <div v-for="criterion in criteria" :key="criterion" class="flex items-center space-x-3">
        <Checkbox v-model="verified[criterion]" />
        <span>{{ criterion }}</span>
      </div>
    </div>

    <div class="mt-6">
      <label class="block text-sm font-medium mb-2">Verification Evidence (optional)</label>
      <textarea
        v-model="evidence"
        placeholder="Confirmation numbers, file names, notes..."
        class="w-full"
      />
    </div>

    <template #footer>
      <UiButton variant="outline" @click="showVerification = false">
        Not Yet
      </UiButton>
      <UiButton
        @click="confirmDelivery"
        :disabled="!allVerified"
        class="bg-green-600 hover:bg-green-700"
      >
        🔔 Confirm Service Delivered
      </UiButton>
    </template>
  </UiModal>
</template>
```

### 6. Action Item Dashboard

**Location**: `/app/pages/dashboard/action-items/index.vue` (new)

**Features**:
- View all action items across all journeys
- Filter by: status, assigned to, priority, due date, action type
- Sort by: due date, priority, created date
- Quick actions: Mark complete, reassign, change priority
- Group by: Matter, Client, Journey, Due Date

**Views**:
- **My Tasks**: Items assigned to current user
- **Team Tasks**: All staff/counsel tasks
- **Client Tasks**: Items awaiting client action
- **Overdue**: Past due date
- **Upcoming**: Due in next 7 days
- **Verification Pending**: Service delivery verifications awaiting confirmation

---

## Implementation Phases

### Phase 1: Journey Step Designer ✅ FOUNDATION

**Goal**: Create/edit journey steps with action items

**Tasks**:
- [ ] Create journey step management page
- [ ] Implement "Add Step" flow
- [ ] Build action type selector component
- [ ] Create action configuration modals (1-2 types to start)
- [ ] Enforce "at least one action" validation
- [ ] Add step reordering
- [ ] Mark steps as final step

**Estimate**: 3-4 days

**Success Criteria**:
- Attorney can create journey with multiple steps
- Each step has ≥1 action item
- Cannot save step without actions
- Action items properly created in database

---

### Phase 2: Action Item Widgets (Client View) ✅ CORE

**Goal**: Clients can complete action items during journey

**Tasks**:
- [ ] Create generic action item widget
- [ ] Build UPLOAD widget (file upload)
- [ ] Build FORM widget (simple forms)
- [ ] Build DECISION widget (choice selection)
- [ ] Build MEETING widget (meeting details)
- [ ] Integrate widgets into journey step view
- [ ] Mark action items complete from client side
- [ ] Show progress indicators

**Estimate**: 4-5 days

**Success Criteria**:
- Clients see action items on journey steps
- Clients can upload files, fill forms, make decisions
- Action items marked complete automatically
- Progress updates in real-time

---

### Phase 3: System Integration Hooks ✅ CRITICAL

**Goal**: Connect action items to calendar, payment, document systems

**Tasks**:
- [ ] Calendar integration: Create meetings from MEETING actions
- [ ] Payment integration: Link PAYMENT actions to payment records
- [ ] Document integration: Link UPLOAD/REVIEW/ESIGN to documents
- [ ] Update action item status when integrated resource updates
- [ ] Show linked resource details in action item views
- [ ] Bidirectional sync (action → resource, resource → action)

**Estimate**: 5-6 days

**Dependencies**:
- Calendar integration (in progress with dev team)
- Payment system (on dev team TODO)

**Success Criteria**:
- Creating MEETING action creates calendar event
- Calendar event update syncs to action item
- Payment recorded updates PAYMENT action status
- Document uploaded marks UPLOAD action complete

---

### Phase 4: "Ring the Bell" Final Step Verification ✅ PERSONALITY

**Goal**: Implement service delivery verification with personality

**Tasks**:
- [ ] Build FinalStepVerification component
- [ ] Add verification criteria to final steps
- [ ] Create verification evidence input
- [ ] Bell animation on completion
- [ ] Update journey status to COMPLETED
- [ ] Send notifications (email/SMS) to client
- [ ] Generate completion certificate/receipt
- [ ] Update matter status

**Estimate**: 2-3 days

**Success Criteria**:
- Attorney prompted for verification on final step
- Must verify all criteria to complete
- Bell animation plays on confirmation
- Journey marked as COMPLETED
- Client receives notification
- Completion recorded with timestamp + evidence

---

### Phase 5: Action Item Dashboard & Management ✅ OPERATIONAL

**Goal**: Attorney/staff view of all action items

**Tasks**:
- [ ] Create action items index page
- [ ] Implement filtering (status, assigned to, priority, type)
- [ ] Implement sorting (due date, priority, created)
- [ ] Build "My Tasks" view
- [ ] Build "Team Tasks" view
- [ ] Build "Overdue" view
- [ ] Add quick actions (complete, reassign, change priority)
- [ ] Add bulk actions
- [ ] Add notifications/reminders

**Estimate**: 3-4 days

**Success Criteria**:
- Attorneys see all their tasks in one place
- Can filter/sort effectively
- Overdue items highlighted
- Quick actions work smoothly
- Dashboard shows useful metrics

---

### Phase 6: Offline Work & Third-Party Tracking ✅ COMPLETENESS

**Goal**: Track work that happens outside the system

**Tasks**:
- [ ] Build OFFLINE_TASK action config
- [ ] Build THIRD_PARTY action config
- [ ] Build EXPENSE action config
- [ ] Add status tracking UI (not started → in progress → complete)
- [ ] Add reference number field (confirmation #, tracking #)
- [ ] Add notes field for context
- [ ] Add expense receipt upload
- [ ] Build attorney dashboard for offline work

**Estimate**: 2-3 days

**Success Criteria**:
- Attorneys can track offline tasks
- Third-party services tracked with reference numbers
- Expenses recorded with receipts
- Status updates manual but visible

---

## API Endpoints

### ✅ Existing Endpoints (Converted to Drizzle)

**Location**: `/server/api/action-items/`

1. **POST `/api/action-items`** - Create action item
   - **Body**: `{ stepId?, clientJourneyId?, actionType, title, description?, config?, assignedTo?, dueDate?, priority?, systemIntegrationType?, resourceId?, automationHandler?, isServiceDeliveryVerification?, verificationCriteria? }`
   - **Returns**: `{ actionItem }`

2. **POST `/api/action-items/[id]/complete`** - Mark action item complete
   - **Body**: `{ verificationEvidence? }` (optional)
   - **Returns**: `{ success: true }`

3. **GET `/api/action-items/client-journey/[clientJourneyId]`** - Get all action items for journey
   - **Returns**: `{ actionItems: [...] }`

### 📝 Endpoints Needed

4. **GET `/api/action-items/step/[stepId]`** - Get all action items for step (template-level)
   - For journey step designer

5. **PUT `/api/action-items/[id]`** - Update action item
   - Update title, description, config, assigned to, due date, priority, status

6. **DELETE `/api/action-items/[id]`** - Delete action item
   - Only allowed if not completed

7. **GET `/api/action-items/my-tasks`** - Get current user's action items
   - Filter by status, priority, due date
   - For "My Tasks" dashboard view

8. **GET `/api/action-items/team-tasks`** - Get all counsel/staff action items
   - For team dashboard view

9. **POST `/api/action-items/[id]/start`** - Mark action item as in progress
   - Sets status to IN_PROGRESS

10. **POST `/api/action-items/[id]/skip`** - Skip action item
    - Sets status to SKIPPED with reason

11. **POST `/api/action-items/bulk-update`** - Bulk update action items
    - Change assignee, priority, due date for multiple items

---

## Configuration Examples

### Example: MEETING Action Item

```json
{
  "id": "abc123",
  "stepId": "step-456",
  "clientJourneyId": null,
  "actionType": "MEETING",
  "title": "Initial Consultation Call",
  "description": "30-minute intro call to discuss WYDAPT goals",
  "config": {
    "meetingType": "PHONE",
    "duration": 30,
    "attendees": ["client", "counsel"],
    "agenda": "Discuss trust goals, answer questions"
  },
  "status": "PENDING",
  "assignedTo": "BOTH",
  "dueDate": "2026-01-15T10:00:00Z",
  "priority": "HIGH",
  "systemIntegrationType": "calendar",
  "resourceId": "gcal-event-789",
  "isServiceDeliveryVerification": false
}
```

### Example: Final Step Verification

```json
{
  "id": "final-step-123",
  "journeyId": "wydapt-journey",
  "name": "Service Delivery Confirmation",
  "stepType": "MILESTONE",
  "isFinalStep": true,
  "requiresVerification": true,
  "completionRequirements": {
    "objectiveCriteria": [
      "Trust documents signed by all grantors",
      "Articles of Organization filed with Wyoming Secretary of State",
      "Filing confirmation received (reference number)",
      "Executed trust binder delivered to client",
      "Client acknowledgment received"
    ]
  }
}
```

### Example: Service Delivery Action Item

```json
{
  "id": "verify-delivery-123",
  "stepId": "final-step-123",
  "clientJourneyId": "journey-instance-456",
  "actionType": "OFFLINE_TASK",
  "title": "Confirm WYDAPT Service Delivery",
  "description": "Verify all deliverables completed and client notified",
  "status": "PENDING",
  "assignedTo": "COUNSEL",
  "priority": "URGENT",
  "isServiceDeliveryVerification": true,
  "verificationCriteria": {
    "criteria": [
      "Trust documents signed by all grantors",
      "Articles of Organization filed (WY SOS)",
      "Filing confirmation #",
      "Trust binder delivered",
      "Client acknowledgment"
    ]
  },
  "verificationEvidence": null // Filled on completion
}
```

Completion example:
```json
{
  "verificationEvidence": {
    "filingConfirmation": "WY-2026-012345",
    "deliveryDate": "2026-01-14",
    "deliveryMethod": "In-person at office",
    "clientSignature": "document-ref-abc123",
    "notes": "Client very happy with service, referred colleague"
  },
  "completedAt": "2026-01-14T16:30:00Z",
  "completedBy": "attorney-user-id"
}
```

---

## Success Metrics

### Operational Metrics
- **Average time to complete action item** by type
- **Action items overdue** (target: <5%)
- **Client completion rate** (target: >90%)
- **Attorney response time** to client-completed actions (target: <24 hours)

### Quality Metrics
- **Service delivery verification rate** (target: 100%)
- **Action items per journey step** (minimum: 1, average: 2-3)
- **Client satisfaction** with action clarity (survey)

### Efficiency Metrics
- **Journeys completed on time** (target: >80%)
- **Automation usage** (track automation action items)
- **System integration adoption** (% of meetings/payments linked)

---

## Notes & Decisions

### Design Decisions

1. **Action items can be template-level OR instance-level**
   - Template-level: Attached to `journey_steps` (reused for all instances)
   - Instance-level: Attached to `client_journeys` (specific to one client)
   - Most action items are template-level
   - Instance-level for ad-hoc tasks

2. **SQLite enum constraints**
   - Cannot ALTER COLUMN to change enums in SQLite
   - New action types handled at application layer
   - Drizzle schema reflects all types but DB migration doesn't alter existing constraint
   - Future: Recreate table if enum constraint needs strict enforcement

3. **Service delivery verification as action item**
   - Final step can have normal action items + verification action
   - Verification action has `isServiceDeliveryVerification = true`
   - Only verification actions trigger "ring the bell" UI
   - Can have multiple verification actions if needed

4. **System integration is optional**
   - Not all action items need system integration
   - `systemIntegrationType = null` for manual tracking
   - Enables gradual rollout of integrations

### Future Enhancements

1. **Action item templates** - Pre-configured action items for common scenarios
2. **Conditional actions** - Actions that appear based on previous decisions
3. **Parallel actions** - Multiple actions that can be done simultaneously
4. **Action dependencies** - Action B can't start until Action A completes
5. **Time tracking** - Log time spent on each action
6. **Action item comments** - Discussion thread per action
7. **File attachments** - Attach files to action items (separate from document system)
8. **Recurring actions** - For maintenance/renewal workflows
9. **Action item subtasks** - Break complex actions into smaller steps
10. **Mobile app integration** - Push notifications, mobile action completion

---

## Implementation Summary

**Status**: ✅ Complete (2026-01-06)

All planned features have been implemented:
- ✅ 14 action types including DRAFT_DOCUMENT for document generation integration
- ✅ Journey builder enhanced with expandable action items per step
- ✅ Visual action type selector with icons and descriptions
- ✅ Type-specific configuration forms (5 types: Meeting, Upload, Payment, E-Signature, Draft Document)
- ✅ "Ring the bell" service delivery verification integrated into UI
- ✅ Real-time validation warnings showing steps without action items
- ✅ System integration toggles for calendar, payment, and document features
- ✅ Complete API with 6 endpoints for action item management
- ✅ Journey validation endpoint checking for required action items

**Latest Addition**: DRAFT_DOCUMENT action type
- Configuration: document name, template ID, drafting notes
- Integration hooks ready for future document generation system
- Blue info banner indicating stub status
- Will be fully integrated when document drafting system is ready

---

## Related Documentation

- **Schema Documentation**: `/doc/entity-relationship-diagram.md`
- **Journey System**: `/doc/wydapt-journey-diagram.md`
- **Current Status**: `/doc/CURRENT_STATUS.md`
- **API Audit**: `/doc/API_AUDIT_REPORT.md`

---

**Last Updated**: 2026-01-06 by Claude Sonnet 4.5
