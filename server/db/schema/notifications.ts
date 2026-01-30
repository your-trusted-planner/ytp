// Notification System tables
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'

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
