// Journey System tables
import { sqliteTable, text, integer, primaryKey, foreignKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { serviceCatalog } from './catalog'
import { mattersToServices } from './matters'

// Journeys - The overall journey/workflow (replaces "pipeline" concept)
export const journeys = sqliteTable('journeys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g., "Trust Formation Journey", "Annual Maintenance Journey"
  description: text('description'),
  journeyType: text('journey_type', { enum: ['ENGAGEMENT', 'SERVICE'] }).notNull().default('SERVICE'), // Engagement vs service journey
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  estimatedDurationDays: integer('estimated_duration_days'), // Total expected duration
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Journeys to Catalog - Junction table for many-to-many relationship
// Allows an engagement journey to be associated with multiple service products
export const journeysToCatalog = sqliteTable('journeys_to_catalog', {
  journeyId: text('journey_id').notNull().references(() => journeys.id, { onDelete: 'cascade' }),
  catalogId: text('catalog_id').notNull().references(() => serviceCatalog.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  pk: primaryKey({ columns: [table.journeyId, table.catalogId] })
}))

// Journey Steps - Individual steps in a journey (can be MILESTONE or BRIDGE)
export const journeySteps = sqliteTable('journey_steps', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id').notNull().references(() => journeys.id, { onDelete: 'cascade' }),
  stepType: text('step_type', { enum: ['MILESTONE', 'BRIDGE'] }).notNull().default('MILESTONE'),
  name: text('name').notNull(), // e.g., "Homework Assigned", "Snapshot Review & Revision"
  description: text('description'),
  stepOrder: integer('step_order').notNull().default(0), // Position in journey sequence
  responsibleParty: text('responsible_party', { enum: ['CLIENT', 'COUNSEL', 'STAFF', 'BOTH'] }).notNull().default('CLIENT'),
  expectedDurationDays: integer('expected_duration_days'), // Expected time to complete this step
  automationConfig: text('automation_config'), // JSON: automation rules for this step
  helpContent: text('help_content'), // Markdown/HTML help content for this step
  allowMultipleIterations: integer('allow_multiple_iterations', { mode: 'boolean' }).notNull().default(false), // For BRIDGE steps

  // Final step verification ("ring the bell")
  isFinalStep: integer('is_final_step', { mode: 'boolean' }).notNull().default(false),
  completionRequirements: text('completion_requirements'), // JSON: objective requirements for completion
  requiresVerification: integer('requires_verification', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Journeys - Tracks which clients are on which journeys
export const clientJourneys = sqliteTable('client_journeys', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  matterId: text('matter_id'), // Links to the specific matter (engagement)
  catalogId: text('catalog_id'), // Links to the service catalog item (for SERVICE journeys)
  journeyId: text('journey_id').notNull().references(() => journeys.id),
  currentStepId: text('current_step_id').references(() => journeySteps.id), // Current position
  status: text('status', { enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED'] }).notNull().default('NOT_STARTED'),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),
  // For ENGAGEMENT journeys: tracks which service the client selected at journey completion
  selectedCatalogId: text('selected_catalog_id').references(() => serviceCatalog.id),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  pausedAt: integer('paused_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  // Composite foreign key to matters_to_services (engagement)
  engagementFk: foreignKey({
    columns: [table.matterId, table.catalogId],
    foreignColumns: [mattersToServices.matterId, mattersToServices.catalogId]
  })
}))

// Journey Step Progress - Tracks progress through each step for each client
export const journeyStepProgress = sqliteTable('journey_step_progress', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').notNull().references(() => clientJourneys.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull().references(() => journeySteps.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_ATTORNEY', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  clientApproved: integer('client_approved', { mode: 'boolean' }).notNull().default(false),
  attorneyApproved: integer('attorney_approved', { mode: 'boolean' }).notNull().default(false),
  clientApprovedAt: integer('client_approved_at', { mode: 'timestamp' }),
  attorneyApprovedAt: integer('attorney_approved_at', { mode: 'timestamp' }),
  iterationCount: integer('iteration_count').notNull().default(0), // For BRIDGE steps - tracks revision #
  notes: text('notes'), // Internal notes about this step's progress
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Action Items - Tasks that must be completed as part of a journey step
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  stepId: text('step_id').references(() => journeySteps.id, { onDelete: 'cascade' }), // Template-level action
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id, { onDelete: 'cascade' }), // Instance-level action
  actionType: text('action_type', {
    enum: [
      'QUESTIONNAIRE', 'DECISION', 'UPLOAD', 'REVIEW', 'ESIGN',
      'NOTARY', 'PAYMENT', 'MEETING', 'KYC',
      'AUTOMATION', 'THIRD_PARTY', 'OFFLINE_TASK', 'EXPENSE', 'FORM', 'DRAFT_DOCUMENT'
    ]
  }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  config: text('config'), // JSON: type-specific configuration
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  assignedTo: text('assigned_to', { enum: ['CLIENT', 'ATTORNEY', 'STAFF'] }).notNull().default('CLIENT'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),

  // System integration tracking
  systemIntegrationType: text('system_integration_type', { enum: ['calendar', 'payment', 'document', 'manual'] }),
  resourceId: text('resource_id'), // ID of calendar event, payment, document, etc.
  automationHandler: text('automation_handler'), // For AUTOMATION action types

  // Service delivery verification ("ring the bell")
  isServiceDeliveryVerification: integer('is_service_delivery_verification', { mode: 'boolean' }).notNull().default(false),
  verificationCriteria: text('verification_criteria'), // JSON: objective completion criteria
  verificationEvidence: text('verification_evidence'), // JSON: proof of completion

  completedAt: integer('completed_at', { mode: 'timestamp' }),
  completedBy: text('completed_by').references(() => users.id), // Who completed it
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Bridge Conversations - Chat/messaging within bridge steps
export const bridgeConversations = sqliteTable('bridge_conversations', {
  id: text('id').primaryKey(),
  stepProgressId: text('step_progress_id').notNull().references(() => journeyStepProgress.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id), // null if AI response
  message: text('message').notNull(),
  isAiResponse: integer('is_ai_response', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON: additional data (attachments, reactions, etc.)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Automations - Journey automation rules
export const automations = sqliteTable('automations', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id').references(() => journeys.id, { onDelete: 'cascade' }),
  stepId: text('step_id').references(() => journeySteps.id, { onDelete: 'cascade' }), // Optional: step-specific
  name: text('name').notNull(),
  description: text('description'),
  triggerType: text('trigger_type', { enum: ['TIME_BASED', 'EVENT_BASED', 'CONDITIONAL', 'MANUAL'] }).notNull(),
  triggerConfig: text('trigger_config').notNull(), // JSON: when to trigger
  actionConfig: text('action_config').notNull(), // JSON: what to do
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastExecutedAt: integer('last_executed_at', { mode: 'timestamp' }),
  executionCount: integer('execution_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// FAQ Library - Knowledge base for AI agent and help content
export const faqLibrary = sqliteTable('faq_library', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id').references(() => journeys.id), // Optional: journey-specific
  stepId: text('step_id').references(() => journeySteps.id), // Optional: step-specific
  category: text('category'), // e.g., "Trust Formation", "Documents", "Payment"
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  tags: text('tags'), // JSON array of tags for searching
  viewCount: integer('view_count').notNull().default(0),
  helpfulCount: integer('helpful_count').notNull().default(0), // User feedback
  unhelpfulCount: integer('unhelpful_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
