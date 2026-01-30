// Marketing and Referral tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'

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
  // Import tracking - JSON with source, externalId, flags, sourceData
  importMetadata: text('import_metadata'),
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
