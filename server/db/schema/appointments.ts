// Appointments and Calendars
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { matters } from './matters'
import { questionnaires, serviceCatalog } from './catalog'

// Rooms — physical conference rooms / meeting spaces
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g., "Conf. Room A"
  building: text('building'), // e.g., "Main Office"
  address: text('address'), // Physical address
  capacity: integer('capacity'), // Number of people
  calendarEmail: text('calendar_email'), // Google resource calendar email (nullable)
  calendarProvider: text('calendar_provider', { enum: ['google', 'microsoft'] }).default('google'),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Appointment Types — user-defined bookable service types
export const appointmentTypes = sqliteTable('appointment_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  defaultDurationMinutes: integer('default_duration_minutes').notNull().default(60),
  color: text('color').notNull().default('#6366f1'), // Hex color
  consultationFee: integer('consultation_fee').default(0), // In cents
  consultationFeeEnabled: integer('consultation_fee_enabled', { mode: 'boolean' }).notNull().default(false),
  questionnaireId: text('questionnaire_id').references(() => questionnaires.id),
  serviceCatalogId: text('service_catalog_id').references(() => serviceCatalog.id),
  staffEligibility: text('staff_eligibility', { enum: ['any', 'attorneys_only', 'specific'] }).notNull().default('any'),
  assignedAttorneyIds: text('assigned_attorney_ids'), // JSON array of user IDs (used when staffEligibility = 'specific')
  businessHours: text('business_hours'), // JSON BusinessHours | null, null = system default 9-5 M-F
  defaultLocation: text('default_location'),
  defaultLocationConfig: text('default_location_config'), // JSON LocationConfig
  isPubliclyBookable: integer('is_publicly_bookable', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
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
  locationConfig: text('location_config'), // JSON LocationConfig
  roomId: text('room_id').references(() => rooms.id),
  videoMeetingId: text('video_meeting_id'), // FK-like ref to videoMeetings.id
  notes: text('notes'),
  preCallNotes: text('pre_call_notes'), // Attorney notes before the call
  callNotes: text('call_notes'), // Attorney notes during/after the call
  callNotesUpdatedAt: integer('call_notes_updated_at', { mode: 'timestamp' }),
  clientId: text('client_id').references(() => users.id, { onDelete: 'cascade' }),
  // Google Calendar integration
  googleCalendarEventId: text('google_calendar_event_id'),
  googleCalendarEmail: text('google_calendar_email'),
  // Matter link
  matterId: text('matter_id').references(() => matters.id),
  // Appointment metadata
  appointmentType: text('appointment_type', { enum: ['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER'] }).default('MEETING'),
  appointmentTypeId: text('appointment_type_id').references(() => appointmentTypes.id),
  attendeeIds: text('attendee_ids'), // JSON array of staff user IDs attending
  createdById: text('created_by_id').references(() => users.id),
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
  appointmentTypeId: text('appointment_type_id').references(() => appointmentTypes.id),
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
  // Slot selection
  selectedSlotStart: integer('selected_slot_start', { mode: 'timestamp' }),
  selectedSlotEnd: integer('selected_slot_end', { mode: 'timestamp' }),
  timezone: text('timezone'),
  bookingCompletedAt: integer('booking_completed_at', { mode: 'timestamp' }),
  convertedToClientAt: integer('converted_to_client_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Video Meeting Connections — per-user OAuth tokens for video providers
export const videoMeetingConnections = sqliteTable('video_meeting_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: ['zoom', 'google_meet'] }).notNull(),
  providerAccountId: text('provider_account_id'), // Zoom user ID
  providerEmail: text('provider_email'),
  accessTokenKey: text('access_token_key'), // KV key for cached access token
  refreshToken: text('refresh_token'), // Encrypted, stored in DB — source of truth
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  status: text('status', { enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR'] }).notNull().default('ACTIVE'),
  lastError: text('last_error'),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

// Video Meetings — tracks meetings created for appointments
export const videoMeetings = sqliteTable('video_meetings', {
  id: text('id').primaryKey(),
  appointmentId: text('appointment_id').references(() => appointments.id),
  provider: text('provider', { enum: ['zoom', 'google_meet'] }).notNull(),
  providerMeetingId: text('provider_meeting_id'), // Zoom meeting ID
  hostUserId: text('host_user_id').references(() => users.id),
  joinUrl: text('join_url'),
  hostUrl: text('host_url'),
  passcode: text('passcode'),
  status: text('status', { enum: ['ACTIVE', 'UPDATED', 'CANCELLED', 'ENDED'] }).notNull().default('ACTIVE'),
  providerData: text('provider_data'), // JSON — provider-specific metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})
