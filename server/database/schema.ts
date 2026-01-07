import { sqliteTable, text, integer, blob, primaryKey, foreignKey, customType } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Custom type for JSON string arrays
const jsonArray = customType<{ data: string[]; driverData: string }>({
  dataType() {
    return 'text'
  },
  toDriver(value: string[]): string {
    return JSON.stringify(value)
  },
  fromDriver(value: string): string[] {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
})

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['ADMIN', 'LAWYER', 'CLIENT', 'LEAD', 'PROSPECT'] }).notNull().default('PROSPECT'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  avatar: text('avatar'),
  status: text('status', { enum: ['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE'] }).notNull().default('PROSPECT'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Profiles table
export const clientProfiles = sqliteTable('client_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  spouseName: text('spouse_name'),
  spouseEmail: text('spouse_email'),
  spousePhone: text('spouse_phone'),
  hasMinorChildren: integer('has_minor_children', { mode: 'boolean' }).notNull().default(false),
  childrenInfo: text('children_info'), // JSON string
  businessName: text('business_name'),
  businessType: text('business_type'),
  hasWill: integer('has_will', { mode: 'boolean' }).notNull().default(false),
  hasTrust: integer('has_trust', { mode: 'boolean' }).notNull().default(false),
  grantorType: text('grantor_type', { enum: ['SINGLE', 'ADDITIONAL'] }).notNull().default('SINGLE'), // Single or Additional Grantor
  lastUpdated: integer('last_updated', { mode: 'timestamp' }),
  assignedLawyerId: text('assigned_lawyer_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Appointments table
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] }).notNull().default('PENDING'),
  location: text('location'),
  notes: text('notes'),
  preCallNotes: text('pre_call_notes'), // Attorney notes before the call
  callNotes: text('call_notes'), // Attorney notes during/after the call
  callNotesUpdatedAt: integer('call_notes_updated_at', { mode: 'timestamp' }),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Template Folders table
export const templateFolders = sqliteTable('template_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id').references((): any => templateFolders.id),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Document Templates table
export const documentTemplates = sqliteTable('document_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  folderId: text('folder_id').references(() => templateFolders.id),
  content: text('content').notNull(),
  variables: text('variables').notNull(), // JSON string
  grantorType: text('grantor_type', { enum: ['SINGLE', 'TWO_GRANTORS', 'BOTH'] }).notNull().default('BOTH'), // Which grantor type uses this
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  order: integer('order').notNull().default(0),
  originalFileName: text('original_file_name'),
  fileExtension: text('file_extension'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Documents table
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED'] }).notNull().default('DRAFT'),
  templateId: text('template_id').references(() => documentTemplates.id),
  serviceId: text('service_id').references(() => services.id), // Link to service
  matterId: text('matter_id').references(() => matters.id), // Link to case (matter)
  content: text('content').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  variableValues: text('variable_values'), // JSON string
  grantorType: text('grantor_type', { enum: ['SINGLE', 'TWO_GRANTORS'] }).notNull().default('SINGLE'), // For proper document selection
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false),
  notarizationStatus: text('notarization_status', { enum: ['NOT_REQUIRED', 'PENDING', 'SCHEDULED', 'COMPLETED'] }),
  pandaDocRequestId: text('pandadoc_request_id'), // Deprecated - moving to offline notary
  attorneyApproved: integer('attorney_approved', { mode: 'boolean' }).notNull().default(false),
  attorneyApprovedAt: integer('attorney_approved_at', { mode: 'timestamp' }),
  attorneyApprovedBy: text('attorney_approved_by').references(() => users.id),
  readyForSignature: integer('ready_for_signature', { mode: 'boolean' }).notNull().default(false),
  readyForSignatureAt: integer('ready_for_signature_at', { mode: 'timestamp' }),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  signedAt: integer('signed_at', { mode: 'timestamp' }),
  signatureData: text('signature_data'),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Notes table
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Activities table
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Settings table
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Service Catalog (formerly matters - products/services definitions)
export const serviceCatalog = sqliteTable('service_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // Trust, LLC Formation, Maintenance, etc.
  type: text('type', { enum: ['SINGLE', 'RECURRING'] }).notNull().default('SINGLE'),
  price: integer('price').notNull(), // Price in cents
  duration: text('duration'), // For recurring: 'MONTHLY', 'ANNUALLY', 'QUARTERLY'
  consultationFee: integer('consultation_fee').default(37500), // Configurable consultation fee in cents
  consultationFeeEnabled: integer('consultation_fee_enabled', { mode: 'boolean' }).notNull().default(true),
  engagementLetterId: text('engagement_letter_id').references(() => documentTemplates.id),
  workflowSteps: text('workflow_steps'), // JSON array of workflow steps
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Matters (Client Cases - grouping entity)
export const matters = sqliteTable('matters', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // e.g., "Smith Family Trust 2024"
  matterNumber: text('matter_number'),
  description: text('description'),
  status: text('status', { enum: ['OPEN', 'CLOSED', 'PENDING'] }).notNull().default('OPEN'),
  contractDate: integer('contract_date', { mode: 'timestamp' }),
  leadAttorneyId: text('lead_attorney_id').references(() => users.id), // For engagement letter mapping
  engagementJourneyId: text('engagement_journey_id').references(() => clientJourneys.id), // Track engagement journey
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Matters to Services - Junction table (many:many)
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

// Payments - Track all payments at matter level
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

// Services (formerly client_matters - specific engaged services)
// NOTE: This table is being phased out in favor of matters_to_services junction table
// Keeping it temporarily for backward compatibility during migration
export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  catalogId: text('catalog_id').notNull().references(() => serviceCatalog.id), // Link to product definition
  journeyId: text('journey_id').references(() => journeys.id), // Optional: link to active journey
  engagementLetterDocId: text('engagement_letter_doc_id').references(() => documents.id),
  status: text('status', { enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }).notNull().default('PENDING'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }), // For single services when completed
  renewalDate: integer('renewal_date', { mode: 'timestamp' }), // For recurring services
  totalPaid: integer('total_paid').notNull().default(0), // Total paid in cents
  fee: integer('fee').notNull(), // Actual fee charged (can differ from catalog price)
  paymentStatus: text('payment_status', { enum: ['UNPAID', 'PARTIAL', 'PAID'] }).notNull().default('UNPAID'),
  assignedAttorneyId: text('assigned_attorney_id').references(() => users.id),
  requiresPaymentToActivate: integer('requires_payment_to_activate', { mode: 'boolean' }).notNull().default(false), // For maintenance packages
  parentServiceId: text('parent_service_id').references((): any => services.id), // Link maintenance to WYDAPT
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

// ===================================
// JOURNEY SYSTEM TABLES
// ===================================

// Journeys - The overall journey/workflow (replaces "pipeline" concept)
export const journeys = sqliteTable('journeys', {
  id: text('id').primaryKey(),
  serviceCatalogId: text('service_catalog_id').references(() => serviceCatalog.id), // Which product/service this journey is for
  name: text('name').notNull(), // e.g., "Trust Formation Journey", "Annual Maintenance Journey"
  description: text('description'),
  journeyType: text('journey_type', { enum: ['ENGAGEMENT', 'SERVICE'] }).notNull().default('SERVICE'), // Engagement vs service journey
  isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false), // Template vs. active
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  estimatedDurationDays: integer('estimated_duration_days'), // Total expected duration
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

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
  catalogId: text('catalog_id'), // Links to the service catalog item
  journeyId: text('journey_id').notNull().references(() => journeys.id),
  currentStepId: text('current_step_id').references(() => journeySteps.id), // Current position
  status: text('status', { enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED'] }).notNull().default('NOT_STARTED'),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),
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
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_COUNSEL', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  clientApproved: integer('client_approved', { mode: 'boolean' }).notNull().default(false),
  counselApproved: integer('counsel_approved', { mode: 'boolean' }).notNull().default(false),
  clientApprovedAt: integer('client_approved_at', { mode: 'timestamp' }),
  counselApprovedAt: integer('counsel_approved_at', { mode: 'timestamp' }),
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
  assignedTo: text('assigned_to', { enum: ['CLIENT', 'COUNSEL', 'STAFF'] }).notNull().default('CLIENT'),
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

// Document Uploads - Client-uploaded documents
export const documentUploads = sqliteTable('document_uploads', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id, { onDelete: 'cascade' }),
  actionItemId: text('action_item_id').references(() => actionItems.id),
  uploadedByUserId: text('uploaded_by_user_id').notNull().references(() => users.id),
  documentCategory: text('document_category'), // e.g., "Legal", "Financial", "Identity", "Address Proof"
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  mimeType: text('mime_type').notNull(),
  status: text('status', { enum: ['PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'REQUIRES_REVISION'] }).notNull().default('PENDING_REVIEW'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewNotes: text('review_notes'),
  version: integer('version').notNull().default(1), // Version control
  replacesUploadId: text('replaces_upload_id').references((): any => documentUploads.id), // Self-reference for versions
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Snapshot Versions - Track snapshot document revisions
export const snapshotVersions = sqliteTable('snapshot_versions', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').notNull().references(() => clientJourneys.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  content: text('content').notNull(), // JSON: structured snapshot data
  generatedPdfPath: text('generated_pdf_path'),
  status: text('status', { enum: ['DRAFT', 'SENT', 'UNDER_REVISION', 'APPROVED'] }).notNull().default('DRAFT'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  approvedByClient: integer('approved_by_client', { mode: 'boolean' }).notNull().default(false),
  approvedByCounsel: integer('approved_by_counsel', { mode: 'boolean' }).notNull().default(false),
  clientFeedback: text('client_feedback'), // JSON: structured feedback from client
  counselNotes: text('counsel_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
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

// Marketing Sources - Track where clients come from
export const marketingSources = sqliteTable('marketing_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  acquisitionCost: integer('acquisition_cost'), // in cents
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Marketing Attribution - Track individual client sources
export const clientMarketingAttribution = sqliteTable('client_marketing_attribution', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  marketingSourceId: text('marketing_source_id').references(() => marketingSources.id),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmContent: text('utm_content'),
  utmTerm: text('utm_term'),
  referrerUrl: text('referrer_url'),
  landingPage: text('landing_page'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ===================================
// DOCUMENT PROCESSING
// ===================================

// Uploaded Documents - Track DOCX files uploaded for processing
export const uploadedDocuments = sqliteTable('uploaded_documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  blobPath: text('blob_path').notNull(), // R2 storage path

  // Processing status
  status: text('status', { enum: ['processing', 'completed', 'failed'] }).notNull().default('processing'),

  // Extracted content (populated after processing)
  contentText: text('content_text'),
  contentHtml: text('content_html'),
  paragraphCount: integer('paragraph_count'),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),

  // Metadata
  fileSize: integer('file_size'), // bytes
  mimeType: text('mime_type'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ===================================
// PAYMENT INTEGRATIONS
// ===================================

// LawPay OAuth2 Connections - Store LawPay authorization metadata
// Note: Access tokens are cached in KV store for performance
export const lawpayConnections = sqliteTable('lawpay_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  merchantPublicKey: text('merchant_public_key').notNull(),
  merchantName: text('merchant_name'),
  scope: text('scope').notNull(), // OAuth scope (e.g., "payments")
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // When access token expires
  revokedAt: integer('revoked_at', { mode: 'timestamp' }), // When connection was revoked
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ===================================
// WYDAPT WORKFLOW ENHANCEMENTS
// ===================================

// Additional Grantors - Support for "Single or Additional Grantor" system
export const additionalGrantors = sqliteTable('additional_grantors', {
  id: text('id').primaryKey(),
  primaryUserId: text('primary_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  grantorUserId: text('grantor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relationship: text('relationship', { enum: ['SPOUSE', 'CO_TRUSTEE', 'PARTNER', 'OTHER'] }).notNull().default('SPOUSE'),
  matterId: text('matter_id').references(() => matters.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Attorney Calendars - Multiple Google Calendar support per attorney
export const attorneyCalendars = sqliteTable('attorney_calendars', {
  id: text('id').primaryKey(),
  attorneyId: text('attorney_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  calendarId: text('calendar_id').notNull(), // Google Calendar ID
  calendarName: text('calendar_name').notNull(),
  calendarEmail: text('calendar_email').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  serviceAccountKey: text('service_account_key'), // Encrypted JSON
  timezone: text('timezone').notNull().default('America/New_York'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Document Summaries - Pre-payment document choice summary
export const documentSummaries = sqliteTable('document_summaries', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').notNull().references(() => clientJourneys.id, { onDelete: 'cascade' }),
  summaryData: text('summary_data').notNull(), // JSON: document choices
  isFinal: integer('is_final', { mode: 'boolean' }).notNull().default(false),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Service Packages - Configurable WYDAPT packages (1-4)
export const servicePackages = sqliteTable('service_packages', {
  id: text('id').primaryKey(),
  serviceCatalogId: text('service_catalog_id').notNull().references(() => serviceCatalog.id, { onDelete: 'cascade' }),
  packageNumber: integer('package_number').notNull(),
  packageName: text('package_name').notNull(),
  packageDescription: text('package_description'),
  includedDocuments: text('included_documents').notNull(), // JSON array of template IDs
  additionalFee: integer('additional_fee').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Selected Packages - Track which packages client chose
export const clientSelectedPackages = sqliteTable('client_selected_packages', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').references(() => services.id, { onDelete: 'cascade' }), // Legacy - being phased out
  matterId: text('matter_id'), // New: links to specific matter
  catalogId: text('catalog_id'), // New: links to service catalog item
  packageId: text('package_id').notNull().references(() => servicePackages.id, { onDelete: 'cascade' }),
  selectedAt: integer('selected_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  // Composite foreign key to matters_to_services (engagement)
  engagementFk: foreignKey({
    columns: [table.matterId, table.catalogId],
    foreignColumns: [mattersToServices.matterId, mattersToServices.catalogId]
  })
}))

// NOTE: servicePayments table has been replaced by the payments table (matter-level)
// This table definition has been removed - see payments table above

// Notary Documents - Offline notarization workflow (download/upload)
export const notaryDocuments = sqliteTable('notary_documents', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  clientJourneyId: text('client_journey_id').notNull().references(() => clientJourneys.id, { onDelete: 'cascade' }),
  stepProgressId: text('step_progress_id').references(() => journeyStepProgress.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['PENDING', 'DOWNLOADED', 'NOTARIZED', 'UPLOADED', 'COMPLETED'] }).notNull().default('PENDING'),
  downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
  downloadedBy: text('downloaded_by').references(() => users.id),
  notarizedPdfPath: text('notarized_pdf_path'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }),
  uploadedBy: text('uploaded_by').references(() => users.id),
  notaryName: text('notary_name'),
  notaryCommissionNumber: text('notary_commission_number'),
  notaryState: text('notary_state'),
  notaryExpirationDate: integer('notary_expiration_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Public Bookings - Pre-account booking system
export const publicBookings = sqliteTable('public_bookings', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  questionnaireId: text('questionnaire_id').references(() => questionnaires.id),
  questionnaireResponses: text('questionnaire_responses'), // JSON
  consultationFeePaid: integer('consultation_fee_paid', { mode: 'boolean' }).notNull().default(false),
  paymentId: text('payment_id'),
  paymentAmount: integer('payment_amount'),
  attorneyId: text('attorney_id').references(() => users.id),
  calendarId: text('calendar_id').references(() => attorneyCalendars.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  userId: text('user_id').references(() => users.id),
  status: text('status', { enum: ['PENDING_PAYMENT', 'PENDING_BOOKING', 'BOOKED', 'CONVERTED', 'CANCELLED'] }).notNull().default('PENDING_PAYMENT'),
  bookingCompletedAt: integer('booking_completed_at', { mode: 'timestamp' }),
  convertedToClientAt: integer('converted_to_client_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ===================================
// PEOPLE AND RELATIONSHIPS
// ===================================

// People - Separates identity from authentication
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  // Personal Information
  firstName: text('first_name'),
  lastName: text('last_name'),
  middleNames: jsonArray('middle_names'), // Custom type handles serialization
  fullName: text('full_name'),
  // Contact Information
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  // Additional Details
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
  ssnLast4: text('ssn_last_4'),
  // For Corporate Entities
  entityName: text('entity_name'),
  entityType: text('entity_type'),
  entityEin: text('entity_ein'),
  // Notes
  notes: text('notes'),
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Client Relationships - Links clients to people
export const clientRelationships = sqliteTable('client_relationships', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // SPOUSE, CHILD, PARENT, etc.
  ordinal: integer('ordinal').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Matter Relationships - Links matters to people
export const matterRelationships = sqliteTable('matter_relationships', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').notNull().references(() => matters.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // GRANTOR, TRUSTEE, BENEFICIARY, etc.
  ordinal: integer('ordinal').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

