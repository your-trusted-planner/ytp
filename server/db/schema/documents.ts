// Document-related tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { matters } from './matters'
import { clientJourneys, actionItems } from './journeys'

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
