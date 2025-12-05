import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  lastUpdated: integer('last_updated', { mode: 'timestamp' }),
  assignedLawyerId: text('assigned_lawyer_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Template Folders table
export const templateFolders = sqliteTable('template_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: text('parent_id').references((): any => templateFolders.id),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  order: integer('order').notNull().default(0),
  originalFileName: text('original_file_name'),
  fileExtension: text('file_extension'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Documents table
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED'] }).notNull().default('DRAFT'),
  templateId: text('template_id').references(() => documentTemplates.id),
  matterId: text('matter_id').references(() => matters.id), // Link to matter/product
  content: text('content').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  variableValues: text('variable_values'), // JSON string
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false),
  notarizationStatus: text('notarization_status', { enum: ['NOT_REQUIRED', 'PENDING', 'SCHEDULED', 'COMPLETED'] }),
  pandaDocRequestId: text('pandadoc_request_id'), // PandaDoc API request ID
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  signedAt: integer('signed_at', { mode: 'timestamp' }),
  signatureData: text('signature_data'),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Notes table
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Activities table
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Settings table
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Matters table (products/services)
export const matters = sqliteTable('matters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // Trust, LLC Formation, Maintenance, etc.
  type: text('type', { enum: ['SINGLE', 'RECURRING'] }).notNull().default('SINGLE'),
  price: integer('price').notNull(), // Price in cents
  duration: text('duration'), // For recurring: 'MONTHLY', 'ANNUALLY', 'QUARTERLY'
  engagementLetterId: text('engagement_letter_id').references(() => documentTemplates.id),
  workflowSteps: text('workflow_steps'), // JSON array of workflow steps
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Client Matters (engaged services)
export const clientMatters = sqliteTable('client_matters', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  matterId: text('matter_id').notNull().references(() => matters.id),
  engagementLetterDocId: text('engagement_letter_doc_id').references(() => documents.id),
  status: text('status', { enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }).notNull().default('PENDING'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }), // For single matters when completed
  renewalDate: integer('renewal_date', { mode: 'timestamp' }), // For recurring matters
  totalPaid: integer('total_paid').notNull().default(0), // Total paid in cents
  totalPrice: integer('total_price').notNull(), // Expected total in cents
  paymentStatus: text('payment_status', { enum: ['UNPAID', 'PARTIAL', 'PAID'] }).notNull().default('UNPAID'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Pre-Consultation Questionnaires
export const questionnaires = sqliteTable('questionnaires', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  matterId: text('matter_id').references(() => matters.id), // Optional: link to specific matter
  questions: text('questions').notNull(), // JSON array of questions
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Questionnaire Responses
export const questionnaireResponses = sqliteTable('questionnaire_responses', {
  id: text('id').primaryKey(),
  questionnaireId: text('questionnaire_id').notNull().references(() => questionnaires.id),
  appointmentId: text('appointment_id').references(() => appointments.id),
  userId: text('user_id').references(() => users.id), // If user is logged in
  responses: text('responses').notNull(), // JSON object of question/answer pairs
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// ===================================
// JOURNEY SYSTEM TABLES
// ===================================

// Journeys - The overall journey/workflow (replaces "pipeline" concept)
export const journeys = sqliteTable('journeys', {
  id: text('id').primaryKey(),
  matterId: text('matter_id').references(() => matters.id), // Which matter this journey is for
  name: text('name').notNull(), // e.g., "Trust Formation Journey", "Annual Maintenance Journey"
  description: text('description'),
  isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false), // Template vs. active
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  estimatedDurationDays: integer('estimated_duration_days'), // Total expected duration
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Journey Steps - Individual steps in a journey (can be MILESTONE or BRIDGE)
export const journeySteps = sqliteTable('journey_steps', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id').notNull().references(() => journeys.id, { onDelete: 'cascade' }),
  stepType: text('step_type', { enum: ['MILESTONE', 'BRIDGE'] }).notNull().default('MILESTONE'),
  name: text('name').notNull(), // e.g., "Homework Assigned", "Snapshot Review & Revision"
  description: text('description'),
  stepOrder: integer('step_order').notNull().default(0), // Position in journey sequence
  responsibleParty: text('responsible_party', { enum: ['CLIENT', 'COUNCIL', 'STAFF', 'BOTH'] }).notNull().default('CLIENT'),
  expectedDurationDays: integer('expected_duration_days'), // Expected time to complete this step
  automationConfig: text('automation_config'), // JSON: automation rules for this step
  helpContent: text('help_content'), // Markdown/HTML help content for this step
  allowMultipleIterations: integer('allow_multiple_iterations', { mode: 'boolean' }).notNull().default(false), // For BRIDGE steps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Client Journeys - Tracks which clients are on which journeys
export const clientJourneys = sqliteTable('client_journeys', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  journeyId: text('journey_id').notNull().references(() => journeys.id),
  currentStepId: text('current_step_id').references(() => journeySteps.id), // Current position
  status: text('status', { enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED'] }).notNull().default('NOT_STARTED'),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  pausedAt: integer('paused_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Journey Step Progress - Tracks progress through each step for each client
export const journeyStepProgress = sqliteTable('journey_step_progress', {
  id: text('id').primaryKey(),
  clientJourneyId: text('client_journey_id').notNull().references(() => clientJourneys.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull().references(() => journeySteps.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_COUNCIL', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  clientApproved: integer('client_approved', { mode: 'boolean' }).notNull().default(false),
  councilApproved: integer('council_approved', { mode: 'boolean' }).notNull().default(false),
  clientApprovedAt: integer('client_approved_at', { mode: 'timestamp' }),
  councilApprovedAt: integer('council_approved_at', { mode: 'timestamp' }),
  iterationCount: integer('iteration_count').notNull().default(0), // For BRIDGE steps - tracks revision #
  notes: text('notes'), // Internal notes about this step's progress
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Action Items - Tasks that must be completed as part of a journey step
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  stepId: text('step_id').references(() => journeySteps.id, { onDelete: 'cascade' }), // Template-level action
  clientJourneyId: text('client_journey_id').references(() => clientJourneys.id, { onDelete: 'cascade' }), // Instance-level action
  actionType: text('action_type', { enum: ['QUESTIONNAIRE', 'DECISION', 'UPLOAD', 'REVIEW', 'ESIGN', 'NOTARY', 'PAYMENT', 'MEETING', 'KYC'] }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  config: text('config'), // JSON: type-specific configuration
  status: text('status', { enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'SKIPPED'] }).notNull().default('PENDING'),
  assignedTo: text('assigned_to', { enum: ['CLIENT', 'COUNCIL', 'STAFF'] }).notNull().default('CLIENT'),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }).notNull().default('MEDIUM'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  completedBy: text('completed_by').references(() => users.id), // Who completed it
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Bridge Conversations - Chat/messaging within bridge steps
export const bridgeConversations = sqliteTable('bridge_conversations', {
  id: text('id').primaryKey(),
  stepProgressId: text('step_progress_id').notNull().references(() => journeyStepProgress.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id), // null if AI response
  message: text('message').notNull(),
  isAiResponse: integer('is_ai_response', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON: additional data (attachments, reactions, etc.)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  approvedByCouncil: integer('approved_by_council', { mode: 'boolean' }).notNull().default(false),
  clientFeedback: text('client_feedback'), // JSON: structured feedback from client
  councilNotes: text('council_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

