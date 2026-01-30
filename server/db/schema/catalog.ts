// Service Catalog and Questionnaires
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { documentTemplates } from './documents'
import { users } from './auth'
import { appointments } from './appointments'

// Service Categories - categories for organizing services in the catalog
export const serviceCategories = sqliteTable('service_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Service Catalog (formerly matters - products/services definitions)
export const serviceCatalog = sqliteTable('service_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // Trust, LLC Formation, Maintenance, etc.
  type: text('type', { enum: ['SINGLE', 'RECURRING', 'HOURLY'] }).notNull().default('SINGLE'),
  price: integer('price').notNull(), // Price in cents
  duration: text('duration'), // For recurring: 'MONTHLY', 'ANNUALLY', 'QUARTERLY'
  defaultAttorneyRate: integer('default_attorney_rate'), // Cents, default attorney hourly rate for HOURLY type
  defaultStaffRate: integer('default_staff_rate'), // Cents, default staff hourly rate for HOURLY type
  consultationFee: integer('consultation_fee').default(37500), // Configurable consultation fee in cents
  consultationFeeEnabled: integer('consultation_fee_enabled', { mode: 'boolean' }).notNull().default(true),
  engagementLetterId: text('engagement_letter_id').references(() => documentTemplates.id),
  workflowSteps: text('workflow_steps'), // JSON array of workflow steps
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Pre-Consultation Questionnaires
export const questionnaires = sqliteTable('questionnaires', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  serviceCatalogId: text('service_catalog_id').references(() => serviceCatalog.id), // Optional: link to specific service type
  questions: text('questions').notNull(), // JSON array of questions
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Questionnaire Responses
export const questionnaireResponses = sqliteTable('questionnaire_responses', {
  id: text('id').primaryKey(),
  questionnaireId: text('questionnaire_id').notNull().references(() => questionnaires.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  userId: text('user_id').references(() => users.id), // If user is logged in
  responses: text('responses').notNull(), // JSON object of question/answer pairs
  attorneyNotes: text('attorney_notes'), // Notes taken by attorney before/during call
  attorneyNotesUpdatedAt: integer('attorney_notes_updated_at', { mode: 'timestamp' }),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
