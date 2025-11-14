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

