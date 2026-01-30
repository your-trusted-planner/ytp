// Matters and related tables
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { serviceCatalog } from './catalog'
import { clientJourneys } from './journeys'

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

  // Import tracking - JSON with source, externalId, flags, sourceData
  importMetadata: text('import_metadata'),

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

  // Trust accounting integration (added for billing system)
  fundSource: text('fund_source', { enum: ['TRUST', 'DIRECT', 'SPLIT'] }).notNull().default('DIRECT'),
  trustTransactionId: text('trust_transaction_id'), // References trustTransactions.id (forward ref)
  invoiceId: text('invoice_id'), // References invoices.id (forward ref)
  checkNumber: text('check_number'),
  referenceNumber: text('reference_number'),
  recordedBy: text('recorded_by').references(() => users.id),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
