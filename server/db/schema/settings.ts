// Settings and Configuration tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Settings table
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

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
