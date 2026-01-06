# WYDAPT Journey Configurability Analysis

**Context:** This platform is a PoC for a scalable estate planning firm management system. Journey steps must be **configurable by admin users** to facilitate workflows and communication, not hardcoded to the WYDAPT use case.

**Date:** January 2026
**Related:** `wydapt-implementation-gap-analysis.md`, `wydapt-journey-diagram.md`

---

## Executive Summary

The current implementation has **good foundational flexibility** but is **missing critical admin configuration UI** and some **hardcoded assumptions** that limit configurability. The database schema is well-designed for flexible journeys, but the admin tools to configure them don't exist yet.

**Key Findings:**
- ✅ Database schema supports flexible journey configuration
- ✅ Journey steps can have arbitrary actions, documents, and workflows
- ❌ **CRITICAL:** No admin UI to configure journey steps
- ❌ **CRITICAL:** Step logic hardcoded in seed scripts, not admin-configurable
- ❌ Workflow automation rules not configurable
- ❌ Communication templates not admin-editable
- ⚠️ Some payment/conversion logic will need to remain in code vs. fully configurable

---

## Database Schema Configurability Assessment

### ✅ FLEXIBLE: Journey Definition Structure

**Schema Location:** `server/database/schema.ts` lines 234-313

The schema is **well-designed for configurability**:

```typescript
// Journeys - can create unlimited journey types
export const journeys = sqliteTable('journeys', {
  serviceCatalogId: text('service_catalog_id'), // Link to any service
  name: text('name'), // Admin-defined name
  description: text('description'), // Admin-defined description
  isTemplate: integer('is_template', { mode: 'boolean' }), // Template vs. instance
  isActive: integer('is_active', { mode: 'boolean' }),
  estimatedDurationDays: integer('estimated_duration_days')
})

// Journey Steps - flexible step definitions
export const journeySteps = sqliteTable('journey_steps', {
  journeyId: text('journey_id'),
  stepType: text('step_type', { enum: ['MILESTONE', 'BRIDGE'] }), // Admin chooses type
  name: text('name'), // Admin-defined
  description: text('description'), // Admin-defined
  stepOrder: integer('step_order'), // Admin controls sequence
  responsibleParty: text('responsible_party', {
    enum: ['CLIENT', 'COUNSEL', 'STAFF', 'BOTH']
  }), // Admin assigns responsibility
  expectedDurationDays: integer('expected_duration_days'), // Admin estimates
  automationConfig: text('automation_config'), // JSON - FLEXIBLE!
  helpContent: text('help_content'), // Admin-provided guidance
  allowMultipleIterations: integer('allow_multiple_iterations', { mode: 'boolean' })
})

// Action Items - tasks within steps
export const actionItems = sqliteTable('action_items', {
  stepId: text('step_id'), // Can be template-level
  clientJourneyId: text('client_journey_id'), // Or instance-level
  actionType: text('action_type', {
    enum: ['QUESTIONNAIRE', 'DECISION', 'UPLOAD', 'REVIEW', 'ESIGN',
           'NOTARY', 'PAYMENT', 'MEETING', 'KYC']
  }), // Good variety of action types
  title: text('title'),
  description: text('description'),
  config: text('config'), // JSON - FLEXIBLE!
  assignedTo: text('assigned_to', {
    enum: ['CLIENT', 'COUNSEL', 'STAFF']
  })
})

// Automations - event-driven rules
export const automations = sqliteTable('automations', {
  journeyId: text('journey_id'),
  stepId: text('step_id'),
  name: text('name'),
  description: text('description'),
  triggerType: text('trigger_type', {
    enum: ['TIME_BASED', 'EVENT_BASED', 'CONDITIONAL', 'MANUAL']
  }),
  triggerConfig: text('trigger_config'), // JSON - FLEXIBLE!
  actionConfig: text('action_config'), // JSON - FLEXIBLE!
  isActive: integer('is_active', { mode: 'boolean' })
})
```

**Assessment:** ✅ **EXCELLENT** - Schema supports:
- Unlimited journey types (not just WYDAPT)
- Admin-defined steps, names, descriptions
- Flexible action types
- JSON configuration fields for extensibility
- Template vs. instance pattern
- Automation rules with JSON config

---

## Current Hardcoded Assumptions

### 🔴 CRITICAL: Seed Script Hardcodes WYDAPT Steps

**Location:** `server/api/admin/seed-wydapt.post.ts` lines 26-97

```typescript
const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    journeyStepName: 'Engagement & Initial Setup',
    stepOrder: 1,
    stepType: 'MILESTONE',
    responsibleParty: 'COUNSEL',
    expectedDurationDays: 3,
    allowMultipleIterations: false,
    documents: [
      {
        templateNames: ['Engagement Agreement'],
        condition: 'always'
      }
    ]
  },
  // ... 6 more hardcoded steps
]
```

**Problem:** This script **hardcodes** the WYDAPT journey structure. Admins can't change:
- Number of steps
- Step names
- Document associations
- Step sequence
- Responsible parties

**Solution Needed:**
- Admin UI to create/edit journey steps
- Import/export journey templates
- Visual workflow builder

---

### ⚠️ PARTIAL: Document-Template Associations

**Location:** `server/api/admin/seed-wydapt.post.ts` lines 98-392

The seed script hardcodes which documents belong to which steps:

```typescript
{
  journeyStepName: 'Trust Formation - Review & Sign',
  documents: [
    {
      templateNames: [
        'DAPT Trust Agreement - Grantor - 1 Grantor',
        'DAPT Trust Agreement - Grantor - 2 Grantors',
        'DAPT Trust Agreement - Non-Grantor - 1 Grantor',
        'DAPT Trust Agreement - Non-Grantor - 2 Grantors'
      ],
      condition: 'requires_selection'
    }
  ]
}
```

**What's Flexible:**
- Conditions: `'always'`, `'requires_selection'`, `'package_1'`, `'package_2'`, etc.
- Multiple templates per step
- Can check grantor type, package selection

**What's Hardcoded:**
- Condition logic is string-based, not JSON rule engine
- Admin can't define new conditions
- Template selection logic embedded in code

**Solution Needed:**
- JSON rule engine for document conditions
- Admin UI to associate templates with steps
- Visual condition builder (e.g., "Show if Package 2 selected AND grantorType = 'TWO_GRANTORS'")

---

### 🔴 CRITICAL: Payment Logic Hardcoded

**Example Locations:**
- `server/api/public/booking/create.post.ts` (consultation fee logic)
- Future payment endpoints (when built)

**Hardcoded Assumptions:**
- $375 consultation fee
- 50/50 payment split for service
- Payment gates at specific steps

**What Should Be Configurable:**
- Payment amounts per service
- Payment schedule (50/50, 33/33/34, monthly, etc.)
- Which steps require payment
- Payment gates can be enabled/disabled per step

**Solution Needed:**
- `servicePaymentSchedule` table to define custom payment plans
- Step-level payment requirement configuration
- UI for admins to set payment schedules

---

### ⚠️ PARTIAL: Role Conversion Logic

**Current Design:**
- PROSPECT → CLIENT conversion expected at Step 2b
- Hardcoded to check "engagement letter signed + payment received"

**What Should Be Configurable:**
- Which step triggers role conversion
- What conditions must be met (documents signed, payments made, etc.)
- Different services might convert at different points

**Solution Needed:**
- Step-level configuration: `triggersRoleConversion: true`
- JSON-based conversion rules: `{ requiresPayment: ['DEPOSIT_50'], requiresDocuments: ['engagement-letter'] }`
- Admin UI to configure conversion triggers

---

### 🔴 CRITICAL: Communication Templates Not Configurable

**Current State:**
- No email template system
- No SMS template system
- Notification content would be hardcoded in endpoints

**What Should Be Configurable:**
- Email templates per step/action
- SMS templates per step/action
- Subject lines, body content
- Variable substitution (e.g., `{{clientName}}`, `{{documentName}}`)
- Multi-language support (future)

**Solution Needed:**
- `communicationTemplates` table
- Template editor UI (WYSIWYG for email, plain text for SMS)
- Variable picker/autocomplete
- Test send functionality

---

### ⚠️ PARTIAL: Automation Rules

**Schema Exists:** `automations` table with JSON config fields
**Implementation:** ❌ No automation engine built

**What Should Be Configurable:**
- **Triggers:**
  - Time-based: "3 days after step start"
  - Event-based: "When document signed"
  - Conditional: "If payment status = UNPAID for 7 days"
- **Actions:**
  - Send email/SMS notification
  - Advance to next step
  - Assign task to staff member
  - Update client record
  - Call webhook

**Solution Needed:**
- Automation rule builder UI
- Background job processor to evaluate rules
- Template actions (e.g., "Send reminder email")
- Webhook integration for custom logic

---

## Missing Admin Configuration UI

### 🔴 CRITICAL: Journey Builder Interface

**Needed Features:**

1. **Journey List View**
   - Show all journey templates
   - Clone existing journeys
   - Activate/deactivate journeys
   - Link to service catalog

2. **Journey Step Editor**
   - Visual step sequence (drag-to-reorder)
   - Add/remove/edit steps
   - Configure step properties:
     - Name, description
     - Type (MILESTONE vs. BRIDGE)
     - Responsible party
     - Expected duration
     - Help content
     - Allow multiple iterations

3. **Step Action Configuration**
   - Add action items to step
   - Choose action type (questionnaire, payment, document signing, etc.)
   - Configure action-specific settings
   - Set deadlines/priorities

4. **Document Association**
   - Assign templates to steps
   - Define conditions (package selection, grantor type, etc.)
   - Visual rule builder
   - Preview which documents show for different scenarios

5. **Automation Rule Builder**
   - Choose trigger type
   - Configure trigger conditions
   - Choose actions to execute
   - Test automation rules

**Example UI Flow:**
```
Admin Dashboard
  → Journeys
    → WYDAPT Journey (template)
      → Steps
        → [1] Engagement & Initial Setup
          → Actions
            - Pay consultation fee ($375)
            - Sign engagement letter
          → Documents
            - Engagement Agreement (always)
          → Automations
            - When: Step starts
              Then: Send email to client "Welcome to WYDAPT"
            - When: 3 days after step start AND no payment
              Then: Send reminder SMS
        → [2] Trust Formation
          → Actions
            - Review trust documents
            - Attorney approval required
          → Documents
            - DAPT Trust Agreement (condition: package >= 1)
            - Certificate of Trust (condition: package >= 1)
          → Automations
            - When: Attorney approves
              Then: Advance to next step
```

---

### 🔴 CRITICAL: Communication Template Manager

**Needed Features:**

1. **Template List**
   - Email templates
   - SMS templates
   - In-app notification templates
   - Filter by journey/step

2. **Template Editor**
   - WYSIWYG editor for emails
   - Plain text editor for SMS
   - Variable picker (client name, document links, etc.)
   - Preview with sample data
   - Send test message

3. **Template Variables**
   - Auto-detected from journey context
   - Custom variables per step
   - Computed variables (e.g., `daysUntilDeadline`)

**Example Templates:**

```
Template: "Step 2b - Engagement Letter Ready"
Type: Email
Subject: Your WYDAPT Engagement Letter is Ready - Action Required
Body:
  Hi {{clientFirstName}},

  Your engagement letter for Wyoming Asset Protection Trust services is ready
  for your review and signature.

  Service: {{serviceName}}
  Total Fee: {{serviceFee}}
  Deposit Required: {{depositAmount}}

  Please review and sign by {{deadlineDate}}.

  [Review & Sign Button]

  Questions? Reply to this email or call {{attorneyPhone}}.

  Best regards,
  {{attorneyName}}
```

---

### 🟡 MEDIUM: Payment Schedule Configurator

**Needed Features:**

1. **Payment Plan Templates**
   - Create reusable payment schedules
   - 50/50 split
   - 33/33/34 split
   - Monthly installments
   - Custom schedules

2. **Per-Service Configuration**
   - Link payment schedule to service
   - Set payment amounts
   - Configure which steps require payment
   - Set grace periods, late fees

3. **Payment Gate Configuration**
   - Enable/disable payment gates per step
   - Configure what gets unlocked after payment
   - Set up payment reminders

**Example Configuration:**
```
Service: WYDAPT Formation ($15,000)
Payment Schedule:
  - Consultation Fee: $375 (before Step 1)
  - Deposit: $7,500 (Step 2b - triggers CLIENT conversion)
  - Final Payment: $7,500 (before Step 5 - unlocks signing)

Payment Gates:
  - Step 2b: Requires "Deposit" payment
  - Step 5: Requires "Final Payment" before advancing
```

---

### 🟡 MEDIUM: Document Condition Builder

**Needed Features:**

1. **Visual Rule Builder**
   - Drag-and-drop conditions
   - AND/OR logic
   - Comparison operators (=, !=, >, <, contains, etc.)

2. **Available Conditions**
   - Package selection (1, 2, 3, 4)
   - Grantor type (Single, Two Grantors)
   - Trust type (Grantor, Non-Grantor)
   - Custom questionnaire responses
   - Client profile fields

3. **Preview Mode**
   - Test conditions with sample data
   - See which documents would be included
   - Validate no required documents missing

**Example Rule:**
```
Show "DAPT Trust Agreement - Grantor - 2 Grantors" when:
  - Package >= 1 (AND)
  - Trust Type = Grantor (AND)
  - Grantor Count = 2
```

---

## Configurability Gaps Summary

| Feature | Schema Supports? | API Exists? | Admin UI Exists? | Priority |
|---------|------------------|-------------|------------------|----------|
| **Journey Definition** | ✅ Yes | ⚠️ Partial | ❌ No | 🔴 CRITICAL |
| **Step Configuration** | ✅ Yes | ⚠️ Partial | ❌ No | 🔴 CRITICAL |
| **Document Association** | ✅ Yes | ❌ No | ❌ No | 🔴 CRITICAL |
| **Action Items Config** | ✅ Yes | ⚠️ Partial | ❌ No | 🔴 CRITICAL |
| **Payment Schedules** | ⚠️ Partial | ❌ No | ❌ No | 🔴 CRITICAL |
| **Communication Templates** | ❌ No | ❌ No | ❌ No | 🔴 CRITICAL |
| **Automation Rules** | ✅ Yes | ❌ No | ❌ No | 🟡 HIGH |
| **Condition Rule Engine** | ⚠️ Partial | ❌ No | ❌ No | 🟡 HIGH |
| **Role Conversion Config** | ⚠️ Partial | ❌ No | ❌ No | 🟡 HIGH |
| **Help Content Editor** | ✅ Yes | ✅ Yes | ❌ No | 🟢 MEDIUM |
| **Journey Templates** | ✅ Yes | ⚠️ Partial | ❌ No | 🟢 MEDIUM |
| **Import/Export** | N/A | ❌ No | ❌ No | 🟢 MEDIUM |

---

## Recommended Architecture for Configurability

### 1. Admin Journey Builder (High Priority)

**Component Structure:**
```
/app/pages/dashboard/admin/journeys/
  index.vue                    # List all journey templates
  [id]/
    index.vue                  # Journey overview
    steps.vue                  # Visual step editor (drag-to-reorder)
    [stepId]/
      index.vue                # Step configuration
      actions.vue              # Action items for step
      documents.vue            # Document associations
      automations.vue          # Automation rules
      communications.vue       # Email/SMS templates
```

**Key Features:**
- Visual step sequencer (like Trello board or flowchart)
- Inline editing of step properties
- Copy/paste steps between journeys
- Preview mode showing client-facing view

---

### 2. JSON Rule Engine for Conditions

**Instead of hardcoded conditions like `'package_1'`, use JSON rules:**

```typescript
// Document condition example
{
  "templateId": "dapt-trust-grantor-2",
  "showWhen": {
    "and": [
      { "field": "selectedPackage", "operator": ">=", "value": 1 },
      { "field": "trustType", "operator": "=", "value": "GRANTOR" },
      { "field": "grantorCount", "operator": "=", "value": 2 }
    ]
  }
}

// Step advancement condition example
{
  "advanceWhen": {
    "and": [
      { "field": "documentsStatus", "operator": "=", "value": "SIGNED" },
      { "field": "paymentStatus", "operator": "=", "value": "PAID" }
    ]
  }
}

// Automation trigger example
{
  "triggerWhen": {
    "or": [
      {
        "event": "step.started",
        "delay": { "days": 3 }
      },
      {
        "and": [
          { "field": "paymentStatus", "operator": "=", "value": "UNPAID" },
          { "field": "daysSinceStepStart", "operator": ">", "value": 7 }
        ]
      }
    ]
  },
  "actions": [
    {
      "type": "sendEmail",
      "templateId": "payment-reminder",
      "to": "client"
    }
  ]
}
```

**Implementation:**
- Create rule evaluation engine: `server/utils/rule-engine.ts`
- Support common operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `in`
- Support logical operators: `and`, `or`, `not`
- Allow nested conditions

---

### 3. Communication Template System

**Database Schema (needs creation):**

```typescript
export const communicationTemplates = sqliteTable('communication_templates', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id').references(() => journeys.id),
  stepId: text('step_id').references(() => journeySteps.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['EMAIL', 'SMS', 'IN_APP'] }).notNull(),
  subject: text('subject'), // For email only
  bodyTemplate: text('body_template').notNull(), // Jinja/Handlebars syntax
  variables: text('variables'), // JSON array of available variables
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})

export const communicationLogs = sqliteTable('communication_logs', {
  id: text('id').primaryKey(),
  templateId: text('template_id').references(() => communicationTemplates.id),
  recipientUserId: text('recipient_user_id').references(() => users.id),
  type: text('type', { enum: ['EMAIL', 'SMS', 'IN_APP'] }),
  subject: text('subject'),
  body: text('body'), // Rendered content
  status: text('status', {
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED']
  }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  metadata: text('metadata'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' })
})
```

**Template Rendering:**
- Use existing `server/utils/template-renderer.ts` (already supports Jinja syntax)
- Extend to support email/SMS context (not just documents)
- Add variable validation
- Add preview mode

---

### 4. Payment Schedule Configuration

**Database Schema (needs creation):**

```typescript
export const paymentSchedules = sqliteTable('payment_schedules', {
  id: text('id').primaryKey(),
  serviceCatalogId: text('service_catalog_id').references(() => serviceCatalog.id),
  name: text('name').notNull(), // "Standard 50/50", "Monthly", etc.
  description: text('description'),
  scheduleConfig: text('schedule_config').notNull(), // JSON
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})

// Example scheduleConfig JSON:
{
  "consultationFee": {
    "amount": 37500, // cents
    "required": true,
    "beforeStep": 1
  },
  "installments": [
    {
      "name": "Deposit",
      "percentage": 50,
      "beforeStep": "2b",
      "gates": ["roleConversion"],
      "reminderDaysBefore": 3
    },
    {
      "name": "Final Payment",
      "percentage": 50,
      "beforeStep": 5,
      "gates": ["documentSigning"],
      "reminderDaysBefore": 7
    }
  ]
}
```

**Admin UI:**
- Visual payment schedule builder
- Percentage or fixed amount
- Link payments to specific steps
- Configure reminder timing
- Set what gets gated/unlocked

---

### 5. Automation Engine

**Architecture:**

```typescript
// Background job that runs every minute
// server/jobs/automation-processor.ts

export async function processAutomations() {
  // 1. Get all active automations
  const automations = await db.select()
    .from(schema.automations)
    .where(eq(schema.automations.isActive, true))

  for (const automation of automations) {
    // 2. Get all client journeys that might match this automation
    const journeys = await getMatchingJourneys(automation)

    for (const journey of journeys) {
      // 3. Evaluate trigger condition
      const shouldTrigger = await evaluateTrigger(
        automation.triggerConfig,
        journey
      )

      if (shouldTrigger) {
        // 4. Execute action
        await executeAction(automation.actionConfig, journey)

        // 5. Log execution
        await logAutomationExecution(automation.id, journey.id)
      }
    }
  }
}

// Rule evaluation
async function evaluateTrigger(triggerConfig: any, journey: any): Promise<boolean> {
  const rules = JSON.parse(triggerConfig)

  switch (rules.type) {
    case 'TIME_BASED':
      return evaluateTimeRule(rules, journey)
    case 'EVENT_BASED':
      return evaluateEventRule(rules, journey)
    case 'CONDITIONAL':
      return evaluateConditionRule(rules, journey)
    default:
      return false
  }
}
```

**Supported Automation Examples:**

1. **Time-Based:**
   - "3 days after step starts, send reminder email"
   - "7 days before deadline, send SMS"
   - "Every Monday at 9am, generate status report"

2. **Event-Based:**
   - "When document signed, notify attorney"
   - "When payment received, advance to next step"
   - "When all step actions complete, mark step done"

3. **Conditional:**
   - "If payment unpaid for 7 days, send reminder"
   - "If questionnaire incomplete, send follow-up"
   - "If attorney hasn't reviewed in 2 days, escalate to admin"

---

## Updated Implementation Priorities

### Phase 1: Core Configurability (4-6 weeks)

**Week 1-2: Journey Builder UI**
- Create admin journey list/edit pages
- Visual step editor (basic - just list view initially)
- Step property editor
- Save/load journey definitions

**Week 3: Document Association UI**
- Link templates to steps
- Basic condition builder (dropdown for common conditions)
- Preview document list based on conditions

**Week 4: Communication Templates**
- Create template schema
- Template editor UI (plain text initially, WYSIWYG later)
- Variable substitution in templates
- Send test message

**Week 5-6: Payment Configuration**
- Payment schedule schema
- Payment schedule builder UI
- Link schedules to services
- Configure payment gates per step

### Phase 2: Automation & Rules (3-4 weeks)

**Week 7-8: Rule Engine**
- JSON rule engine implementation
- Replace hardcoded conditions with rules
- Condition builder UI

**Week 9-10: Automation System**
- Automation schema (already exists)
- Automation rule builder UI
- Background job processor
- Test common automation scenarios

### Phase 3: Advanced Features (2-3 weeks)

**Week 11: Journey Templates**
- Import/export journey definitions
- Clone journeys
- Journey versioning

**Week 12-13: Visual Workflow Builder**
- Drag-and-drop step sequencer
- Flowchart view
- Branch/conditional paths

---

## What Should vs. Shouldn't Be Configurable

### ✅ Should Be Admin-Configurable

1. **Journey Structure**
   - Number of steps
   - Step names, descriptions
   - Step sequence
   - Step types (MILESTONE vs BRIDGE)

2. **Step Actions**
   - Which actions are required
   - Action types and configurations
   - Action assignments (client/attorney/staff)

3. **Documents**
   - Which templates are used
   - Conditions for showing documents
   - Document sequence

4. **Communications**
   - Email/SMS content
   - When communications are sent
   - Template variables

5. **Payments**
   - Payment amounts
   - Payment schedule
   - Which steps require payment

6. **Automations**
   - Trigger conditions
   - Actions to execute
   - Enable/disable rules

### ⚠️ Partially Configurable (Config + Code)

1. **Action Types**
   - Admin can configure standard actions (payment, sign, review)
   - Custom action types require code (e.g., "verify SSN via API")

2. **Integrations**
   - Admin can enable/disable integrations
   - Configure credentials (API keys, tokens)
   - But integration logic remains in code

3. **Payment Processing**
   - Admin configures amounts and gates
   - But payment provider integration (LawPay) is code
   - Payment validation logic is code

4. **Role Conversion**
   - Admin configures conversion trigger step
   - Admin configures required conditions
   - But actual role update logic is code (database transaction)

### ❌ Should NOT Be Configurable (Code Only)

1. **Core Business Logic**
   - Database transactions
   - Security/authentication
   - Data validation rules
   - API integrations (LawPay, PandaDoc, Google Calendar)

2. **System Constraints**
   - Database schema (admins can't add tables)
   - User roles/permissions
   - Payment provider selection
   - File storage system

3. **Low-Level Rules**
   - Password requirements
   - Session timeout
   - Rate limiting
   - Error handling

---

## Revised Gap Analysis

With configurability requirements, the gaps shift:

### 🔴 NEW CRITICAL GAPS

1. **Admin Journey Builder** - Doesn't exist at all
2. **Communication Template System** - Doesn't exist at all
3. **Payment Schedule Configurator** - Doesn't exist at all
4. **Document Condition Builder UI** - Doesn't exist at all
5. **Rule Engine** - Hardcoded conditions need to be replaced with JSON rules

### 🔴 STILL CRITICAL (From Original Analysis)

1. **Payment Collection Endpoints** - Still needed to execute configured payment schedules
2. **Role Conversion Logic** - Still needed, but trigger should be configurable
3. **Entity Filing Tracking** - Still needed (may be partially configurable)

### 🟡 Deprioritized (Because Configurable)

1. **8 Steps vs 7 Steps** - Less important if admins can define any number of steps
2. **Hardcoded Step Logic** - Will be replaced by configuration
3. **Specific Document Requirements** - Will be configurable via document association UI

---

## Architectural Recommendations

### 1. Separation of Configuration and Execution

**Pattern:**
- **Configuration Layer** (Admin UI) → Defines WHAT should happen
- **Execution Layer** (API/Jobs) → Does WHAT was configured

**Example:**
```typescript
// Configuration (stored in database)
const stepConfig = {
  name: "Ready for Signature",
  requiredPayment: "FINAL_50",
  actions: [
    { type: "PAYMENT", amount: 750000 },
    { type: "ESIGN", documentGroup: "all-pending" }
  ],
  automations: [
    {
      trigger: { type: "STEP_START" },
      action: { type: "SEND_EMAIL", template: "ready-for-signature" }
    }
  ]
}

// Execution (in code)
async function executeStepActions(step, clientJourney) {
  const config = step.config // From database

  for (const action of config.actions) {
    switch (action.type) {
      case 'PAYMENT':
        await requirePayment(action.amount, clientJourney)
        break
      case 'ESIGN':
        await sendForSignature(action.documentGroup, clientJourney)
        break
      // ... other action types
    }
  }
}
```

### 2. Template-Based Journey System

**Concept:**
- Admins create **journey templates** (like WYDAPT)
- When client engages service, system **instantiates** template
- Instance can be customized per client if needed

**Benefits:**
- Reusable journey definitions
- Easy to create new service types
- Can improve template based on outcomes
- A/B test different journey structures

### 3. Progressive Configuration

**Phase 1:** Basic UI (dropdowns, forms)
- Select from predefined options
- Configure simple parameters

**Phase 2:** Rule Builder (visual, limited)
- AND/OR conditions
- Common field comparisons
- Predefined action types

**Phase 3:** Advanced Builder (low-code)
- Custom JavaScript expressions
- Webhook actions
- Complex branching logic

---

## Conclusion

The **database schema is well-designed for configurability**, but the **admin tooling to configure it doesn't exist**. The biggest gap is not missing features, but **missing admin UI** to configure those features.

**Recommended Approach:**

1. **Phase 1 (Immediate):** Build basic journey builder UI
   - Let admins create/edit steps
   - Assign documents to steps
   - Configure payment requirements
   - Create email templates

2. **Phase 2 (1-2 months):** Add rule engine and automation
   - Replace hardcoded conditions with JSON rules
   - Build visual condition builder
   - Implement automation processor

3. **Phase 3 (2-3 months):** Advanced workflow features
   - Visual flowchart builder
   - Conditional branching
   - Journey versioning and testing

This approach gives you a **working PoC quickly** (Phase 1) while building toward a **fully configurable platform** (Phase 2-3) that can scale to any type of estate planning engagement.

**Key Insight:** The hardcoded WYDAPT journey is actually a **template** showing how the system should work. Don't remove it—use it as the **reference implementation** while building the admin UI to create similar journeys for other engagement types.
