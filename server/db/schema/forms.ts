/**
 * Forms System — configurable form definitions, sections, fields, and submissions.
 *
 * Replaces the legacy questionnaires system for new usage while maintaining
 * backward compatibility. Forms can be used in:
 * - Public booking pages (linked via appointmentTypes.formId)
 * - Journey action items (actionItems.config.formId)
 * - Standalone public links (/f/[slug])
 * - Client intake flows
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { people } from './people'
import { appointments, publicBookings } from './appointments'
import { actionItems, clientJourneys } from './journeys'
import { matters } from './matters'
import { questionnaires } from './catalog'

// ─── Form Definitions ────────────────────────────────────────────────────────

export const forms = sqliteTable('forms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  formType: text('form_type', {
    enum: ['questionnaire', 'intake', 'standalone', 'action']
  }).notNull().default('questionnaire'),
  isMultiStep: integer('is_multi_step', { mode: 'boolean' }).notNull().default(false),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  // JSON: { submitButtonLabel?, successMessage?, redirectUrl?, requireAuth? }
  settings: text('settings'),
  // Migration bridge: if this form was generated from a legacy questionnaire
  legacyQuestionnaireId: text('legacy_questionnaire_id').references(() => questionnaires.id),
  createdById: text('created_by_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ─── Form Sections (pages in multi-step mode) ───────────────────────────────

export const formSections = sqliteTable('form_sections', {
  id: text('id').primaryKey(),
  formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  title: text('title'),
  description: text('description'),
  sectionOrder: integer('section_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ─── Form Fields ─────────────────────────────────────────────────────────────

export const formFields = sqliteTable('form_fields', {
  id: text('id').primaryKey(),
  sectionId: text('section_id').notNull().references(() => formSections.id, { onDelete: 'cascade' }),
  // Denormalized for efficient loading (avoids join through sections)
  formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  fieldType: text('field_type', {
    enum: [
      'text', 'textarea', 'email', 'phone', 'number', 'date',
      'select', 'multi_select', 'radio', 'checkbox',
      'yes_no', 'file_upload', 'scheduler', 'content'
    ]
  }).notNull(),
  label: text('label').notNull(),
  fieldOrder: integer('field_order').notNull().default(0),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  // Grid column span (1-12). Default 12 = full width. 6 = half width.
  colSpan: integer('col_span').notNull().default(12),
  // JSON: type-specific options (select choices, file constraints, scheduler config, etc.)
  config: text('config'),
  // JSON: ConditionalLogic — show/hide logic referencing other field IDs
  conditionalLogic: text('conditional_logic'),
  // Maps this field's value to a people table column (e.g., 'firstName', 'email')
  personFieldMapping: text('person_field_mapping'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ─── Form Submissions ────────────────────────────────────────────────────────

export const formSubmissions = sqliteTable('form_submissions', {
  id: text('id').primaryKey(),
  formId: text('form_id').notNull().references(() => forms.id),
  status: text('status', { enum: ['draft', 'submitted'] }).notNull().default('submitted'),
  lastSectionIndex: integer('last_section_index').notNull().default(0),

  // Context FKs — at most one context will be set per submission (app-enforced)
  publicBookingId: text('public_booking_id').references(() => publicBookings.id, { onDelete: 'set null' }),
  actionItemId: text('action_item_id').references(() => actionItems.id, { onDelete: 'set null' }),
  appointmentId: text('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  matterId: text('matter_id').references(() => matters.id, { onDelete: 'set null' }),
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id, { onDelete: 'set null' }),

  // Person linkage — set when person-field mapping auto-creates/links a person
  personId: text('person_id').references(() => people.id, { onDelete: 'set null' }),
  // Logged-in user who submitted (null for anonymous/public submissions)
  submittedByUserId: text('submitted_by_user_id').references(() => users.id, { onDelete: 'set null' }),

  // JSON: { [fieldId]: value } — the actual response data
  data: text('data').notNull(),

  // Attorney review
  attorneyNotes: text('attorney_notes'),
  attorneyNotesUpdatedAt: integer('attorney_notes_updated_at', { mode: 'timestamp' }),

  // Submission metadata
  submitterEmail: text('submitter_email'),
  submitterIp: text('submitter_ip'),
  // UTM tracking
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
