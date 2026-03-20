import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/* routes
  const db = useDrizzle()

  const calendars = await db
    .select({
      id: schema.attorneyCalendars.id,
      attorneyId: schema.attorneyCalendars.attorneyId,
      calendarId: schema.attorneyCalendars.calendarId,
      calendarName: schema.attorneyCalendars.calendarName,
      calendarEmail: schema.attorneyCalendars.calendarEmail,
      isPrimary: schema.attorneyCalendars.isPrimary,
      timezone: schema.attorneyCalendars.timezone,
      isActive: schema.attorneyCalendars.isActive,
      createdAt: schema.attorneyCalendars.createdAt,
      // Attorney info
      attorneyFirstName: schema.users.firstName,
      attorneyLastName: schema.users.lastName,
      attorneyEmail: schema.users.email
    })
    .from(schema.attorneyCalendars)
    .innerJoin(schema.users, eq(schema.attorneyCalendars.attorneyId, schema.users.id))
    .all()

  return calendars.map(cal => ({
    id: cal.id,
    attorneyId: cal.attorneyId,
    attorneyName: [cal.attorneyFirstName, cal.attorneyLastName].filter(Boolean).join(' '),
    attorneyEmail: cal.attorneyEmail,
    calendarId: cal.calendarId,
    calendarName: cal.calendarName,
    calendarEmail: cal.calendarEmail,
    isPrimary: cal.isPrimary,
    timezone: cal.timezone,
    isActive: cal.isActive,
    createdAt: cal.createdAt
  }))
})
