// Data Migration System tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { people } from './people'

// Integrations - Stores external system configurations (API keys, settings)
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['LAWMATICS', 'WEALTHCOUNSEL', 'CLIO', 'RESEND'] }).notNull(),
  name: text('name').notNull(), // Display name

  // Encrypted credentials (stored in KV for security, reference here)
  credentialsKey: text('credentials_key'), // KV key for encrypted credentials

  // Connection status
  status: text('status', { enum: ['CONFIGURED', 'CONNECTED', 'ERROR'] }).notNull().default('CONFIGURED'),
  lastTestedAt: integer('last_tested_at', { mode: 'timestamp' }),
  lastErrorMessage: text('last_error_message'),

  // Settings (JSON: integration-specific settings)
  settings: text('settings'),

  // Track last sync timestamps per entity type for incremental sync
  // JSON: { "users": "2025-01-23T14:30:00Z", "contacts": "...", "activities": "..." }
  lastSyncTimestamps: text('last_sync_timestamps'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Migration Runs - Tracks each migration execution
export const migrationRuns = sqliteTable('migration_runs', {
  id: text('id').primaryKey(),
  integrationId: text('integration_id').notNull().references(() => integrations.id),

  // Run configuration
  runType: text('run_type', { enum: ['FULL', 'INCREMENTAL'] }).notNull(),
  entityTypes: text('entity_types').notNull(), // JSON array: ['users', 'contacts', 'prospects', 'notes', 'activities']

  // Status
  status: text('status', {
    enum: ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']
  }).notNull().default('PENDING'),

  // Progress tracking
  totalEntities: integer('total_entities'), // Estimated total (if known)
  processedEntities: integer('processed_entities').notNull().default(0),
  createdRecords: integer('created_records').notNull().default(0),
  updatedRecords: integer('updated_records').notNull().default(0),
  skippedRecords: integer('skipped_records').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),

  // Checkpoint for resume (JSON: {entity: 'contacts', page: 45, ...})
  checkpoint: text('checkpoint'),

  // Timing
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Migration Errors - Logs individual record errors for debugging
export const migrationErrors = sqliteTable('migration_errors', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => migrationRuns.id, { onDelete: 'cascade' }),

  entityType: text('entity_type').notNull(), // 'user', 'contact', 'prospect', 'note', 'activity'
  externalId: text('external_id'), // Source system record ID

  errorType: text('error_type', { enum: ['TRANSFORM', 'VALIDATION', 'INSERT', 'API'] }).notNull(),
  errorMessage: text('error_message').notNull(),
  errorDetails: text('error_details'), // JSON: stack trace, raw data, etc.

  // For retry
  retryCount: integer('retry_count').notNull().default(0),
  retriedAt: integer('retried_at', { mode: 'timestamp' }),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Import Duplicates - Track detected duplicates during import for review/resolution
// Critical for preventing cascade failures: when a duplicate is detected, we link to
// the existing person and log it here, rather than skipping entirely
export const importDuplicates = sqliteTable('import_duplicates', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => migrationRuns.id, { onDelete: 'cascade' }),

  // Source record
  source: text('source').notNull(), // 'LAWMATICS'
  externalId: text('external_id').notNull(), // Lawmatics contact ID
  entityType: text('entity_type').notNull(), // 'contact'
  sourceData: text('source_data'), // JSON: original record

  // Match info
  duplicateType: text('duplicate_type').notNull(), // 'EMAIL', 'NAME', 'PHONE'
  matchingField: text('matching_field'), // The field that matched
  matchingValue: text('matching_value'), // The value that matched
  confidenceScore: integer('confidence_score'), // 0-100

  // Existing record
  existingPersonId: text('existing_person_id').references(() => people.id),

  // Resolution
  resolution: text('resolution', { enum: ['LINKED', 'CREATED_NEW', 'SKIPPED', 'PENDING'] }).notNull().default('LINKED'),
  resolvedPersonId: text('resolved_person_id'), // Person ID used in lookup cache

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
