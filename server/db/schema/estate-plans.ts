// Estate Plan System tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { people } from './people'
import { users } from './auth'
import { matters } from './matters'

// Estate Plans - The living plan entity (Plan-Centric Architecture)
// Plans exist independently of matters but connect when work is done
export const estatePlans = sqliteTable('estate_plans', {
  id: text('id').primaryKey(),

  // Link to first grantor (grantor/testator)
  // Note: NOT clientId - plan belongs to PERSON, who may become client later
  // For joint plans, both grantors are equal clients - no hierarchy implied
  grantorPersonId1: text('grantor_person_id_1').notNull().references(() => people.id),

  // For joint plans (married couples) - second grantor, equal to first
  grantorPersonId2: text('grantor_person_id_2').references(() => people.id),

  // Plan identification
  planType: text('plan_type', { enum: ['TRUST_BASED', 'WILL_BASED'] }).notNull(),
  planName: text('plan_name'),  // e.g., "Christensen Legacy Family Trust"

  // Version tracking
  currentVersion: integer('current_version').notNull().default(1),

  // Status lifecycle - designed for full administration
  status: text('status', {
    enum: [
      'DRAFT',           // Being created
      'ACTIVE',          // Signed and in effect
      'AMENDED',         // Has been amended (current version > 1)
      'INCAPACITATED',   // Grantor incapacitated, successor trustee acting
      'ADMINISTERED',    // Death occurred, in administration
      'DISTRIBUTED',     // Assets distributed, pending close
      'CLOSED'           // Fully administered and closed
    ]
  }).notNull().default('DRAFT'),

  // Key dates
  effectiveDate: integer('effective_date', { mode: 'timestamp' }),
  lastAmendedAt: integer('last_amended_at', { mode: 'timestamp' }),
  administrationStartedAt: integer('administration_started_at', { mode: 'timestamp' }),
  closedAt: integer('closed_at', { mode: 'timestamp' }),

  // Matter links (which engagements touched this plan)
  creationMatterId: text('creation_matter_id').references(() => matters.id),

  // External system references
  wealthCounselClientId: text('wealthcounsel_client_id'),
  importMetadata: text('import_metadata'),  // JSON with source info

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Plan Versions - Snapshots over time
export const planVersions = sqliteTable('plan_versions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),

  // What created this version
  matterId: text('matter_id').references(() => matters.id),
  changeType: text('change_type', {
    enum: ['CREATION', 'AMENDMENT', 'RESTATEMENT', 'CORRECTION', 'ADMIN_UPDATE']
  }).notNull(),
  changeDescription: text('change_description'),
  changeSummary: text('change_summary'),  // Brief description of what changed

  // Effective date
  effectiveDate: integer('effective_date', { mode: 'timestamp' }),

  // Snapshot of key data at this version (for historical accuracy)
  roleSnapshot: text('role_snapshot'),  // JSON array of roles at this version

  // Raw source data (preserves original import)
  sourceType: text('source_type', { enum: ['WEALTHCOUNSEL', 'MANUAL', 'OTHER'] }),
  sourceXml: text('source_xml'),     // Original XML if from WealthCounsel
  sourceData: text('source_data'),   // Parsed JSON of all fields

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdBy: text('created_by').references(() => users.id)
})

// Trusts - Trust-specific data
export const trusts = sqliteTable('trusts', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),

  // Trust identification
  trustName: text('trust_name').notNull(),
  trustType: text('trust_type', {
    enum: [
      'REVOCABLE_LIVING',
      'IRREVOCABLE_LIVING',
      'TESTAMENTARY',
      'SPECIAL_NEEDS',
      'CHARITABLE_REMAINDER',
      'CHARITABLE_LEAD',
      'ILIT',           // Irrevocable Life Insurance Trust
      'GRAT',           // Grantor Retained Annuity Trust
      'QPRT',           // Qualified Personal Residence Trust
      'DYNASTY',
      'OTHER'
    ]
  }),

  // Structure
  isJoint: integer('is_joint', { mode: 'boolean' }).default(false),
  isRevocable: integer('is_revocable', { mode: 'boolean' }).default(true),
  jurisdiction: text('jurisdiction'),  // State

  // Key dates
  formationDate: integer('formation_date', { mode: 'timestamp' }),
  fundingDate: integer('funding_date', { mode: 'timestamp' }),

  // Administration-related
  pourOverWillId: text('pour_over_will_id'),  // Forward reference to wills.id

  // External references
  wealthCounselTrustId: text('wealthcounsel_trust_id'),

  // Extended data from WealthCounsel (trust-specific settings)
  trustSettings: text('trust_settings'),  // JSON for MC_ prefixed options

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Wills - Will-specific data
// In joint plans, each principal has their own will
export const wills = sqliteTable('wills', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),

  // Whose will is this? (required for joint plans where each spouse has their own will)
  personId: text('person_id').references(() => people.id),

  // Will identification
  willType: text('will_type', {
    enum: ['SIMPLE', 'POUR_OVER', 'TESTAMENTARY_TRUST', 'OTHER']
  }),
  executionDate: integer('execution_date', { mode: 'timestamp' }),
  jurisdiction: text('jurisdiction'),

  // Codicils
  codicilCount: integer('codicil_count').default(0),

  // Pour-over (links to trust if applicable)
  pourOverTrustId: text('pour_over_trust_id').references(() => trusts.id),

  // Probate status (for administration)
  probateStatus: text('probate_status', {
    enum: ['NOT_FILED', 'FILED', 'ADMITTED', 'CLOSED']
  }),
  probateFiledAt: integer('probate_filed_at', { mode: 'timestamp' }),
  probateCaseNumber: text('probate_case_number'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Ancillary Documents - POAs, healthcare directives, HIPAA authorizations, etc.
// Each principal in a plan has their own set of ancillary documents
export const ancillaryDocuments = sqliteTable('ancillary_documents', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),

  // Whose document is this? (required - each principal has their own)
  personId: text('person_id').notNull().references(() => people.id),

  // Document type
  documentType: text('document_type', {
    enum: [
      'FINANCIAL_POA',           // Durable Financial Power of Attorney
      'HEALTHCARE_POA',          // Healthcare Power of Attorney / Healthcare Proxy
      'ADVANCE_DIRECTIVE',       // Living Will / Advance Directive
      'HIPAA_AUTHORIZATION',     // HIPAA Authorization
      'NOMINATION_OF_GUARDIAN',  // Nomination of Guardian (for self if incapacitated)
      'DECLARATION_OF_GUARDIAN', // Declaration of Guardian for minor children
      'OTHER'
    ]
  }).notNull(),

  // Document details
  title: text('title'),  // Optional custom title
  executionDate: integer('execution_date', { mode: 'timestamp' }),
  jurisdiction: text('jurisdiction'),

  // Document status
  status: text('status', {
    enum: ['DRAFT', 'EXECUTED', 'REVOKED', 'SUPERSEDED']
  }).notNull().default('DRAFT'),

  // Additional metadata
  notes: text('notes'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Plan Roles - Fiduciaries & beneficiaries (the heart of estate planning)
export const planRoles = sqliteTable('plan_roles', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),

  // Version tracking - which version established this role
  establishedInVersion: integer('established_in_version'),
  terminatedInVersion: integer('terminated_in_version'),

  // The person in this role
  personId: text('person_id').notNull().references(() => people.id),

  // For joint plans: whose document does this role apply to?
  // null = plan-level role (e.g., trustee of joint trust, beneficiary)
  // personId = person-level role (e.g., agent for Matt's FPOA, executor for Desiree's will)
  forPersonId: text('for_person_id').references(() => people.id),

  // Link to specific document (optional, for more precise role assignment)
  willId: text('will_id').references(() => wills.id),
  ancillaryDocumentId: text('ancillary_document_id').references(() => ancillaryDocuments.id),

  // Snapshot of person data at time of assignment (for historical accuracy)
  personSnapshot: text('person_snapshot'),  // JSON: name, address, etc.

  // Role classification
  roleCategory: text('role_category', {
    enum: ['GRANTOR', 'FIDUCIARY', 'BENEFICIARY', 'GUARDIAN', 'OTHER']
  }).notNull(),

  roleType: text('role_type', {
    enum: [
      // Grantors/Settlors (both grantors in joint plan use GRANTOR - no hierarchy)
      'GRANTOR', 'TESTATOR',

      // Trustees
      'TRUSTEE', 'CO_TRUSTEE', 'SUCCESSOR_TRUSTEE', 'DISTRIBUTION_TRUSTEE',

      // Beneficiaries
      'PRIMARY_BENEFICIARY', 'CONTINGENT_BENEFICIARY', 'REMAINDER_BENEFICIARY',
      'INCOME_BENEFICIARY', 'PRINCIPAL_BENEFICIARY',

      // Will-specific
      'EXECUTOR', 'CO_EXECUTOR', 'ALTERNATE_EXECUTOR',

      // Powers of Attorney
      'FINANCIAL_AGENT', 'ALTERNATE_FINANCIAL_AGENT',
      'HEALTHCARE_AGENT', 'ALTERNATE_HEALTHCARE_AGENT',

      // Guardians
      'GUARDIAN_OF_PERSON', 'GUARDIAN_OF_ESTATE',
      'ALTERNATE_GUARDIAN_OF_PERSON', 'ALTERNATE_GUARDIAN_OF_ESTATE',

      // Other fiduciaries
      'TRUST_PROTECTOR', 'INVESTMENT_ADVISOR',

      // Witnesses/Notary (for record keeping)
      'WITNESS', 'NOTARY'
    ]
  }).notNull(),

  // Ordering (for successors)
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  ordinal: integer('ordinal').default(0),  // 1st successor, 2nd successor, etc.

  // Beneficiary-specific fields
  sharePercentage: integer('share_percentage'),  // 0-100
  shareType: text('share_type', {
    enum: ['PERCENTAGE', 'SPECIFIC_AMOUNT', 'SPECIFIC_PROPERTY', 'REMAINDER', 'PER_STIRPES', 'PER_CAPITA']
  }),
  shareAmount: integer('share_amount'),  // In cents, for SPECIFIC_AMOUNT
  shareDescription: text('share_description'),  // For SPECIFIC_PROPERTY
  conditions: text('conditions'),  // e.g., "upon reaching age 25"

  // Which trust/subtrust (for plans with multiple trusts)
  trustId: text('trust_id').references(() => trusts.id),
  subtrustName: text('subtrust_name'),  // e.g., "Family Trust", "Marital Trust"

  // Status
  status: text('status', {
    enum: ['ACTIVE', 'SUCCEEDED', 'DECLINED', 'DECEASED', 'REMOVED', 'TERMINATED']
  }).notNull().default('ACTIVE'),

  // Dates
  effectiveDate: integer('effective_date', { mode: 'timestamp' }),
  terminationDate: integer('termination_date', { mode: 'timestamp' }),
  terminationReason: text('termination_reason'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Plan Events - Administration timeline
export const planEvents = sqliteTable('plan_events', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),

  // Event type
  eventType: text('event_type', {
    enum: [
      // Lifecycle events
      'PLAN_CREATED', 'PLAN_SIGNED', 'PLAN_AMENDED', 'PLAN_RESTATED',

      // Trigger events
      'GRANTOR_INCAPACITATED', 'GRANTOR_CAPACITY_RESTORED',
      'FIRST_GRANTOR_DEATH', 'SECOND_GRANTOR_DEATH',

      // Administration events
      'ADMINISTRATION_STARTED', 'SUCCESSOR_TRUSTEE_APPOINTED',
      'TRUST_FUNDED', 'ASSETS_VALUED',
      'DISTRIBUTION_MADE', 'PARTIAL_DISTRIBUTION',
      'TAX_RETURN_FILED', 'NOTICE_SENT',

      // Closure events
      'FINAL_DISTRIBUTION', 'TRUST_TERMINATED', 'PLAN_CLOSED',

      // Other
      'NOTE_ADDED', 'DOCUMENT_ADDED', 'OTHER'
    ]
  }).notNull(),

  // Event details
  eventDate: integer('event_date', { mode: 'timestamp' }).notNull(),
  description: text('description'),
  notes: text('notes'),

  // Related entities
  personId: text('person_id').references(() => people.id),  // Person involved
  roleId: text('role_id').references(() => planRoles.id),   // Role affected
  matterId: text('matter_id').references(() => matters.id), // Related matter

  // For distributions
  distributionAmount: integer('distribution_amount'),  // In cents
  distributionDescription: text('distribution_description'),

  // Metadata
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Plan to Matters - Junction table linking plans to multiple matters
export const planToMatters = sqliteTable('plan_to_matters', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => estatePlans.id, { onDelete: 'cascade' }),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),

  relationshipType: text('relationship_type', {
    enum: ['CREATION', 'AMENDMENT', 'ADMINISTRATION', 'REVIEW', 'OTHER']
  }).notNull(),

  planVersionId: text('plan_version_id').references(() => planVersions.id),
  notes: text('notes'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
