// Appointments and Calendars
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { questionnaires } from './catalog'

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
