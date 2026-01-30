// Activities and Notes tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'

// Notes table - polymorphic association to multiple entity types
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // Polymorphic association - can attach notes to any entity type
  entityType: text('entity_type').notNull(), // 'client', 'matter', 'document', 'appointment', etc.
  entityId: text('entity_id').notNull(),

  // Who created the note
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Import tracking - JSON with source, externalId, flags, sourceData
  importMetadata: text('import_metadata'),

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

  // Import tracking - JSON with source, externalId, flags, sourceData
  importMetadata: text('import_metadata'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
