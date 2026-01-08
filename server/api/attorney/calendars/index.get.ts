// Get attorney's Google Calendar configurations
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const calendars = await db.select({
    id: schema.attorneyCalendars.id,
    calendar_id: schema.attorneyCalendars.calendarId,
    calendar_name: schema.attorneyCalendars.calendarName,
    calendar_email: schema.attorneyCalendars.calendarEmail,
    is_primary: schema.attorneyCalendars.isPrimary,
    timezone: schema.attorneyCalendars.timezone,
    is_active: schema.attorneyCalendars.isActive,
    created_at: schema.attorneyCalendars.createdAt,
    updated_at: schema.attorneyCalendars.updatedAt
  })
    .from(schema.attorneyCalendars)
    .where(and(
      eq(schema.attorneyCalendars.attorneyId, user.id),
      eq(schema.attorneyCalendars.isActive, true)
    ))
    .orderBy(
      desc(schema.attorneyCalendars.isPrimary),
      schema.attorneyCalendars.createdAt
    )
    .all()

  return {
    success: true,
    calendars
  }
})

