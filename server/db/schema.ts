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

// OAuth Providers table - stores enabled authentication providers
export const oauthProviders = sqliteTable('oauth_providers', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().unique(), // Firebase provider ID (e.g., 'google.com', 'facebook.com')
  name: text('name').notNull(), // Display name (e.g., 'Google', 'Facebook')
  logoUrl: text('logo_url'), // Logo image (data URI or external URL)
  buttonColor: text('button_color').notNull().default('#4285F4'), // Hex color for button
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'), // Nullable for OAuth-only users
  firebaseUid: text('firebase_uid').unique(), // Firebase user ID for OAuth users
  role: text('role', { enum: ['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT'] }).notNull().default('PROSPECT'),
  adminLevel: integer('admin_level').default(0), // 0=none, 1=basic admin, 2=full admin, 3+=super admin
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  avatar: text('avatar'),
  // Stored signature image (base64 data URL) for reuse across documents
  // Requires affirmative adoption each time it's used
  signatureImage: text('signature_image'),
  signatureImageUpdatedAt: integer('signature_image_updated_at', { mode: 'timestamp' }),
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
  hasMinorChildren: integer('has_minor_children', { mode: 'boolean' }).notNull().default(false),
  childrenInfo: text('children_info'), // JSON string
  businessName: text('business_name'),
  businessType: text('business_type'),
  hasWill: integer('has_will', { mode: 'boolean' }).notNull().default(false),
  hasTrust: integer('has_trust', { mode: 'boolean' }).notNull().default(false),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }),
  assignedLawyerId: text('assigned_lawyer_id').references(() => users.id),

  // Referral tracking
  referralType: text('referral_type', { enum: ['CLIENT', 'PROFESSIONAL', 'EVENT', 'MARKETING'] }), // How they were referred
  referredByUserId: text('referred_by_user_id').references(() => users.id), // If referred by existing client
  referredByPartnerId: text('referred_by_partner_id'), // References referralPartners.id (forward ref)
  referralNotes: text('referral_notes'),

  // Initial attribution captured at lead creation
  initialAttributionSource: text('initial_attribution_source'),
  initialAttributionMedium: text('initial_attribution_medium'),
  initialAttributionCampaign: text('initial_attribution_campaign'),

  // Google Drive sync tracking
  googleDriveFolderId: text('google_drive_folder_id'), // Drive folder ID for this client
  googleDriveFolderUrl: text('google_drive_folder_url'), // Web URL to folder
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'), // Error message if sync failed
  googleDriveLastSyncAt: integer('google_drive_last_sync_at', { mode: 'timestamp' }),

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
  compiledTemplate: text('compiled_template'), // Precompiled Handlebars template (for Workers compatibility)
  variables: text('variables').notNull(), // JSON string
  variableMappings: text('variable_mappings'), // JSON mapping of template variables to database fields
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  order: integer('order').notNull().default(0),
  originalFileName: text('original_file_name'),
  fileExtension: text('file_extension'),
  docxBlobKey: text('docx_blob_key'), // Path to original DOCX file in blob storage
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
  matterId: text('matter_id').references(() => matters.id), // Link to case (matter)
  content: text('content').notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  variableValues: text('variable_values'), // JSON string
  docxBlobKey: text('docx_blob_key'), // Path to generated DOCX file in blob storage
  signedPdfBlobKey: text('signed_pdf_blob_key'), // Path to signed PDF with signature in blob storage
  notarizationStatus: text('notarization_status'), // Notarization status (e.g., PENDING, SCHEDULED, COMPLETED, NOT_REQUIRED)
  pandadocRequestId: text('pandadoc_request_id'), // PandaDoc request ID for tracking
  requiresNotary: integer('requires_notary', { mode: 'boolean' }).notNull().default(false), // Track for meat-space coordination
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

  // Google Drive sync tracking
  googleDriveFileId: text('google_drive_file_id'), // Drive file ID
  googleDriveFileUrl: text('google_drive_file_url'), // Web URL to file
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'PENDING', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'), // Error message if sync failed
  googleDriveSyncedAt: integer('google_drive_synced_at', { mode: 'timestamp' }),

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

// Activities table - Enhanced for observability, compliance, and KPI tracking
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  description: text('description').notNull(),

  // Actor
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userRole: text('user_role'), // Role AT TIME OF EVENT (denormalized for history)

  // Target entity (what was acted upon)
  targetType: text('target_type'), // 'user', 'client', 'document', 'matter', 'journey', 'template'
  targetId: text('target_id'),

  // Funnel dimensions (for journey/conversion analysis)
  journeyId: text('journey_id'),
  journeyStepId: text('journey_step_id'),
  matterId: text('matter_id'),
  serviceId: text('service_id'),

  // Attribution dimensions (for marketing/referral analysis)
  attributionSource: text('attribution_source'), // utm_source or 'referral'
  attributionMedium: text('attribution_medium'), // utm_medium or referral type
  attributionCampaign: text('attribution_campaign'), // utm_campaign

  // Request context (for audit trail)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  country: text('country'),
  city: text('city'),
  requestId: text('request_id'),

  // Flexible metadata
  metadata: text('metadata'), // JSON string

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
  leadAttorneyId: text('lead_attorney_id').references(() => users.id), // For engagement letter mapping
  engagementJourneyId: text('engagement_journey_id').references(() => clientJourneys.id), // Track engagement journey

  // Google Drive sync tracking
  googleDriveFolderId: text('google_drive_folder_id'), // Drive folder ID for this matter
  googleDriveFolderUrl: text('google_drive_folder_url'), // Web URL to folder
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'), // Error message if sync failed
  googleDriveLastSyncAt: integer('google_drive_last_sync_at', { mode: 'timestamp' }),
  // Store subfolder IDs as JSON: {"Generated Documents": "...", "Client Uploads": "..."}
  googleDriveSubfolderIds: text('google_drive_subfolder_ids'),

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

  // Google Drive sync tracking
  googleDriveFileId: text('google_drive_file_id'), // Drive file ID
  googleDriveFileUrl: text('google_drive_file_url'), // Web URL to file
  googleDriveSyncStatus: text('google_drive_sync_status', { enum: ['NOT_SYNCED', 'PENDING', 'SYNCED', 'ERROR'] }).default('NOT_SYNCED'),
  googleDriveSyncError: text('google_drive_sync_error'), // Error message if sync failed
  googleDriveSyncedAt: integer('google_drive_synced_at', { mode: 'timestamp' }),

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
  approvedByAttorney: integer('approved_by_attorney', { mode: 'boolean' }).notNull().default(false),
  clientFeedback: text('client_feedback'), // JSON: structured feedback from client
  attorneyNotes: text('attorney_notes'),
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

// Referral Partners - Track professional referral sources (CPAs, attorneys, financial advisors)
export const referralPartners = sqliteTable('referral_partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // "John Smith, CPA"
  company: text('company'), // "Smith & Associates"
  type: text('type', { enum: ['CPA', 'ATTORNEY', 'FINANCIAL_ADVISOR', 'ORGANIZATION', 'OTHER'] }).notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Marketing Events - Track webinars, workshops, seminars for conversion funnel analysis
export const marketingEvents = sqliteTable('marketing_events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // "Estate Planning Webinar - Jan 2026"
  type: text('type', { enum: ['WEBINAR', 'WORKSHOP', 'SEMINAR', 'CONFERENCE', 'OTHER'] }).notNull(),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }),
  description: text('description'),
  metadata: text('metadata'), // JSON for flexible event details
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Event Registrations - Track event→client conversion funnel
export const eventRegistrations = sqliteTable('event_registrations', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => marketingEvents.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id), // null if not yet a user
  email: text('email').notNull(), // for matching later
  name: text('name'),
  registeredAt: integer('registered_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  attendedAt: integer('attended_at', { mode: 'timestamp' }),
  convertedToLeadAt: integer('converted_to_lead_at', { mode: 'timestamp' }),
  convertedToClientAt: integer('converted_to_client_at', { mode: 'timestamp' }),
  // Attribution - how they found the event
  attributionSource: text('attribution_source'),
  attributionMedium: text('attribution_medium'),
  attributionCampaign: text('attribution_campaign')
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
// E-SIGNATURE SYSTEM
// ===================================

// Signature Sessions - Track signing ceremonies with audit trail
export const signatureSessions = sqliteTable('signature_sessions', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  signerId: text('signer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Link to action item (for ESIGN action items in journeys)
  // When set, completing signature will auto-complete the action item
  actionItemId: text('action_item_id').references(() => actionItems.id, { onDelete: 'set null' }),

  // Signature tier: STANDARD (engagement letters) or ENHANCED (requires identity verification)
  signatureTier: text('signature_tier', { enum: ['STANDARD', 'ENHANCED'] }).notNull(),

  // Session state
  status: text('status', {
    enum: ['PENDING', 'IDENTITY_REQUIRED', 'READY', 'SIGNED', 'EXPIRED', 'REVOKED']
  }).notNull().default('PENDING'),

  // Identity verification (for ENHANCED tier)
  identityVerified: integer('identity_verified', { mode: 'boolean' }).notNull().default(false),
  identityVerificationMethod: text('identity_verification_method'), // 'KYC', 'SMS_OTP', 'EMAIL_OTP', 'KNOWLEDGE_BASED'
  identityVerifiedAt: integer('identity_verified_at', { mode: 'timestamp' }),
  identityProvider: text('identity_provider'), // 'PERSONA', 'JUMIO', etc.
  identityReferenceId: text('identity_reference_id'), // External verification ID

  // Signing ceremony - unique token for signing URL
  signingToken: text('signing_token').unique(),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),

  // Request context (audit trail)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  geolocation: text('geolocation'), // JSON: {country, region, city}

  // Signature capture
  signatureData: text('signature_data'), // Base64 PNG
  signatureHash: text('signature_hash'), // SHA-256 of signature data
  signedAt: integer('signed_at', { mode: 'timestamp' }),

  // Tamper-evident certificate (JSON containing full audit trail)
  signatureCertificate: text('signature_certificate'),

  // Terms acceptance tracking
  termsAcceptedAt: integer('terms_accepted_at', { mode: 'timestamp' }),
  termsVersion: text('terms_version'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

// NOTE: Deprecated tables removed in data model redesign:
// - services: Replaced by matters_to_services junction table
// - service_packages: Package system deprecated
// - client_selected_packages: Package system deprecated
// - servicePayments: Replaced by payments table (matter-level)
// - additional_grantors: Replaced by people/relationships system
// - notary_documents: Notarization handled via tasking system (RON integration planned for post-MVP)
// - document_summaries: Unused feature removed
//
// NOTE: Deprecated fields removed:
// - clientProfiles.grantorType: Document taxonomy filtering moved to post-MVP
// - clientProfiles.spouseName/spouseEmail/spousePhone: Replaced by people/relationships system
// - documentTemplates.grantorType: Document taxonomy filtering moved to post-MVP
// - documents.grantorType: Document taxonomy filtering moved to post-MVP
// - documents.serviceId: Replaced by matterId (services table removed)

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

// ===================================
// GOOGLE DRIVE INTEGRATION
// ===================================

// Google Drive Configuration - Stores service account and sync settings
export const googleDriveConfig = sqliteTable('google_drive_config', {
  id: text('id').primaryKey(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  serviceAccountEmail: text('service_account_email'), // Service account email
  serviceAccountPrivateKey: text('service_account_private_key'), // Encrypted private key
  sharedDriveId: text('shared_drive_id'), // Required: Shared Drive ID
  rootFolderId: text('root_folder_id'), // Root folder within Shared Drive
  rootFolderName: text('root_folder_name').notNull().default('YTP Client Files'),
  impersonateEmail: text('impersonate_email'), // User to impersonate for domain-wide delegation
  matterSubfolders: text('matter_subfolders').notNull()
    .default('["Generated Documents", "Client Uploads", "Signed Documents", "Correspondence"]'),
  syncGeneratedDocuments: integer('sync_generated_documents', { mode: 'boolean' }).notNull().default(true),
  syncClientUploads: integer('sync_client_uploads', { mode: 'boolean' }).notNull().default(true),
  syncSignedDocuments: integer('sync_signed_documents', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// ===================================
// NOTIFICATION SYSTEM
// ===================================

// Notices - System notifications and alerts
export const notices = sqliteTable('notices', {
  id: text('id').primaryKey(),
  type: text('type', {
    enum: [
      'DRIVE_SYNC_ERROR',
      'DOCUMENT_SIGNED',
      'CLIENT_FILE_UPLOADED',
      'JOURNEY_ACTION_REQUIRED',
      'SYSTEM_ANNOUNCEMENT',
      'PAYMENT_RECEIVED'
    ]
  }).notNull(),
  severity: text('severity', { enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] }).notNull().default('INFO'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  targetType: text('target_type'), // 'client', 'matter', 'document'
  targetId: text('target_id'),
  actionUrl: text('action_url'), // URL to navigate to when clicking the notice
  actionLabel: text('action_label'), // Label for the action button
  metadata: text('metadata'), // JSON for additional data
  createdByUserId: text('created_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Notice Recipients - Links notices to specific users or roles
export const noticeRecipients = sqliteTable('notice_recipients', {
  id: text('id').primaryKey(),
  noticeId: text('notice_id').notNull().references(() => notices.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // Specific user
  targetRole: text('target_role'), // For role-broadcast: 'LAWYER', 'ADMIN', 'STAFF', etc.
  readAt: integer('read_at', { mode: 'timestamp' }),
  dismissedAt: integer('dismissed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
