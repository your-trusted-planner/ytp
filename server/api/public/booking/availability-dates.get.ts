import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { getFreeBusy, getMultiCalendarFreeBusy } from '../../../utils/google-calendar'
import { calculateAvailableSlots, getDefaultBusinessHours } from '../../../utils/availability'
import type { BusinessHoursConfig } from '../../../utils/availability'

const querySchema = z.object({
  attorneyId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/New_York'),
  durationMinutes: z.coerce.number().default(60),
  appointmentTypeId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'attorneyId, startDate, and endDate are required' })
  }

  const { attorneyId, startDate, endDate, timezone, durationMinutes, appointmentTypeId } = parsed.data
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

  // Build list of calendars to check: attorney + optional room calendar
  const calendarEmails = [calendar.calendarEmail]

  // Resolve business hours
  let businessHours: BusinessHoursConfig | undefined = undefined

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
      } catch { /* fall through */ }
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

  if (!businessHours) {
    businessHours = await getDefaultBusinessHours()
  }

  // Fetch free/busy for the entire date range in one call
  const rangeStart = `${startDate}T00:00:00Z`
  const rangeEnd = `${endDate}T23:59:59Z`

  let busyPeriods: Array<{ start: string; end: string }> = []
  try {
    if (calendarEmails.length > 1) {
      busyPeriods = await getMultiCalendarFreeBusy(calendar.calendarEmail, calendarEmails, rangeStart, rangeEnd)
    } else {
      busyPeriods = await getFreeBusy(calendar.calendarEmail, rangeStart, rangeEnd)
    }
  } catch (err: any) {
    console.error('Failed to get free/busy for range:', err.message)
  }

  // Check each date in the range for available slots
  const availableDates: string[] = []
  const current = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10)
    const slots = calculateAvailableSlots(busyPeriods, dateStr, timezone, durationMinutes, businessHours)
    const hasAvailable = slots.some(s => s.available)
    if (hasAvailable) {
      availableDates.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }

  return { availableDates, timezone, attorneyId }
})
