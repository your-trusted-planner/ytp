import { z } from 'zod'
import { inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { getFreeBusy, getMultiCalendarFreeBusy } from '../../utils/google-calendar'
import { calculateAvailableSlots, getDefaultBusinessHours } from '../../utils/availability'

const querySchema = z.object({
  attendeeIds: z.preprocess(
    v => (Array.isArray(v) ? v : v ? [v] : []),
    z.array(z.string()).min(1)
  ),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/Denver'),
  durationMinutes: z.coerce.number().default(60)
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'attendeeIds, startDate, and endDate are required' })
  }

  const { attendeeIds, startDate, endDate, timezone, durationMinutes } = parsed.data
  const db = useDrizzle()

  // Look up calendars for all attendees
  const calendars = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(inArray(schema.attorneyCalendars.attorneyId, attendeeIds))
    .all()

  if (calendars.length === 0) {
    return { availableDates: [], timezone }
  }

  const calendarEmails = calendars.map(c => c.calendarEmail).filter((e): e is string => !!e)
  const primaryEmail = calendarEmails[0]
  if (!primaryEmail) {
    return { availableDates: [], timezone }
  }

  const rangeStart = `${startDate}T00:00:00Z`
  const rangeEnd = `${endDate}T23:59:59Z`

  let busyPeriods: Array<{ start: string; end: string }> = []
  try {
    if (calendarEmails.length > 1) {
      busyPeriods = await getMultiCalendarFreeBusy(primaryEmail, calendarEmails, rangeStart, rangeEnd)
    } else {
      busyPeriods = await getFreeBusy(primaryEmail, rangeStart, rangeEnd)
    }
  } catch (err: any) {
    console.error('Failed to get free/busy for range:', err.message)
  }

  const businessHours = await getDefaultBusinessHours()

  // Check each date in the range for available slots
  const availableDates: string[] = []
  const current = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10)
    const slots = calculateAvailableSlots(busyPeriods, dateStr, timezone, durationMinutes, businessHours)
    if (slots.some(s => s.available)) {
      availableDates.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }

  return { availableDates, timezone }
})
