import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { getFreeBusy, getMultiCalendarFreeBusy } from '../../../utils/google-calendar'
import { calculateAvailableSlots, getDefaultBusinessHours } from '../../../utils/availability'

const querySchema = z.object({
  attorneyId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/New_York'),
  durationMinutes: z.coerce.number().default(60),
  appointmentTypeId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Public endpoint — no auth required
  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'attorneyId and date (YYYY-MM-DD) are required' })
  }

  const { attorneyId, date, timezone, durationMinutes, appointmentTypeId } = parsed.data
  const db = useDrizzle()

  // Get attorney's primary calendar
  const [calendar] = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(eq(schema.attorneyCalendars.attorneyId, attorneyId))
    .all()

  if (!calendar) {
    throw createError({ statusCode: 404, message: 'No calendar configured for this attorney' })
  }

  // Get free/busy for the full day
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  // Build list of calendars to check: attorney + optional room calendar
  const calendarEmails = [calendar.calendarEmail]

  // Check if appointment type has a room with a calendar resource
  let businessHours = undefined
  if (appointmentTypeId) {
    const apptType = await db
      .select({
        businessHours: schema.appointmentTypes.businessHours,
        defaultLocationConfig: schema.appointmentTypes.defaultLocationConfig
      })
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, appointmentTypeId))
      .get()

    if (apptType?.businessHours) {
      try {
        businessHours = JSON.parse(apptType.businessHours)
      } catch { /* fall through to system default */ }
    }

    // If the appointment type has a room with a calendar, include it
    if (apptType?.defaultLocationConfig) {
      try {
        const locationConfig = JSON.parse(apptType.defaultLocationConfig)
        if (locationConfig?.type === 'room' && locationConfig?.roomId) {
          const room = await db
            .select({ calendarEmail: schema.rooms.calendarEmail })
            .from(schema.rooms)
            .where(eq(schema.rooms.id, locationConfig.roomId))
            .get()

          if (room?.calendarEmail) {
            calendarEmails.push(room.calendarEmail)
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // If no per-type override, load system default
  if (!businessHours) {
    businessHours = await getDefaultBusinessHours()
  }

  // Fetch free/busy for all calendars (attorney + room) in one call
  let busyPeriods: Array<{ start: string; end: string }> = []
  try {
    if (calendarEmails.length > 1) {
      busyPeriods = await getMultiCalendarFreeBusy(calendar.calendarEmail, calendarEmails, dayStart, dayEnd)
    } else {
      busyPeriods = await getFreeBusy(calendar.calendarEmail, dayStart, dayEnd)
    }
  } catch (err: any) {
    console.error('Failed to get free/busy:', err.message)
  }

  const slots = calculateAvailableSlots(busyPeriods, date, timezone, durationMinutes, businessHours)

  return {
    date,
    timezone,
    attorneyId,
    slots: slots.filter(s => s.available)
  }
})
