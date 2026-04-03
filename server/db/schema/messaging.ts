// Messaging System tables
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Messages - Delivery log for every sent message (email, SMS, MMS)
// NOTE: FK references to people/users are defined in the migration SQL but
// intentionally omitted from the Drizzle schema to avoid triggering FK
// enforcement during the dev seed (which deletes/re-inserts related rows).
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),

  // Recipient (person-centric) — FK to people.id in migration
  recipientPersonId: text('recipient_person_id'),
  recipientAddress: text('recipient_address').notNull(), // email address or phone number actually used

  // Sender (null for automated/system messages) — FK to users.id in migration
  senderUserId: text('sender_user_id'),

  // Channel
  channel: text('channel', { enum: ['EMAIL', 'SMS', 'MMS'] }).notNull(),

  // Classification
  category: text('category', {
    enum: ['TRANSACTIONAL', 'OPERATIONAL', 'MARKETING']
  }).notNull().default('TRANSACTIONAL'),
  templateSlug: text('template_slug'), // Denormalized for history even if template deleted

  // Content snapshot (what was actually sent — after variable substitution)
  subject: text('subject'), // Email only
  body: text('body').notNull(), // Rendered content
  bodyFormat: text('body_format', { enum: ['HTML', 'TEXT'] }).notNull().default('HTML'),

  // Context — what entity triggered this message
  contextType: text('context_type'), // 'appointment', 'action_item', 'matter', 'journey', etc.
  contextId: text('context_id'),

  // Delivery tracking
  status: text('status', {
    enum: ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'REJECTED']
  }).notNull().default('QUEUED'),
  providerMessageId: text('provider_message_id'), // Resend ID or Zoom/Twilio SID
  failureReason: text('failure_reason'),

  // Metadata
  metadata: text('metadata'), // JSON: attachments info, media URLs, etc.

  // Timestamps
  queuedAt: integer('queued_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  failedAt: integer('failed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, table => ({
  recipientIdx: index('idx_messages_recipient').on(table.recipientPersonId),
  statusIdx: index('idx_messages_status').on(table.status),
  contextIdx: index('idx_messages_context').on(table.contextType, table.contextId),
  createdAtIdx: index('idx_messages_created_at').on(table.createdAt)
}))

// Message Templates - Admin-editable templates with variable substitution
export const messageTemplates = sqliteTable('message_templates', {
  id: text('id').primaryKey(),

  // Identity
  slug: text('slug').notNull().unique(), // e.g., 'booking-confirmation', 'password-reset'
  name: text('name').notNull(),          // Human-readable name for admin UI
  description: text('description'),

  // Classification
  category: text('category', {
    enum: ['TRANSACTIONAL', 'OPERATIONAL', 'MARKETING']
  }).notNull().default('TRANSACTIONAL'),
  triggerEvent: text('trigger_event'), // e.g., 'BOOKING_CONFIRMED', null for ad-hoc

  // Email content (body copy only — HTML shell is applied at render time)
  emailSubject: text('email_subject'),   // Subject line with {{variables}}
  emailBody: text('email_body'),         // Body copy with {{variables}} (NOT full HTML)
  emailText: text('email_text'),         // Plain-text fallback with {{variables}}

  // Email shell options
  emailHeaderText: text('email_header_text'),   // Header bar text (e.g., "Document Ready for Signature")
  emailHeaderColor: text('email_header_color'), // Header bar color (default #0A2540)
  emailActionLabel: text('email_action_label'), // CTA button text (null = no button)

  // SMS content
  smsBody: text('sms_body'), // SMS body with {{variables}} (160 char target)

  // Variable schema — JSON array describing available variables for this template
  // e.g., [{"key":"recipientName","label":"Recipient Name","sampleValue":"Jane Smith"}]
  variableSchema: text('variable_schema'),

  // Channel configuration — JSON: which channels this template sends on
  // e.g., {"email": true, "sms": false}
  channelConfig: text('channel_config'),

  // State
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isSystemTemplate: integer('is_system_template', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
