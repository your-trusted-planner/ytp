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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().default('America/Denver'),
  durationMinutes: z.coerce.number().default(60)
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'attendeeIds and date (YYYY-MM-DD) are required' })
  }

  const { attendeeIds, date, timezone, durationMinutes } = parsed.data
  const db = useDrizzle()

  // Look up calendars for all attendees
  const calendars = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(inArray(schema.attorneyCalendars.attorneyId, attendeeIds))
    .all()

  if (calendars.length === 0) {
    // No calendars configured — return empty slots (graceful degradation)
    return { date, timezone, slots: [] }
  }

  const calendarEmails = calendars.map(c => c.calendarEmail).filter((e): e is string => !!e)
  const primaryEmail = calendarEmails[0]
  if (!primaryEmail) {
    return { date, timezone, slots: [] }
  }

  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`

  let busyPeriods: Array<{ start: string; end: string }> = []
  try {
    if (calendarEmails.length > 1) {
      busyPeriods = await getMultiCalendarFreeBusy(primaryEmail, calendarEmails, dayStart, dayEnd)
    } else {
      busyPeriods = await getFreeBusy(primaryEmail, dayStart, dayEnd)
    }
  } catch (err: any) {
    console.error('Failed to get free/busy:', err.message)
  }

  const businessHours = await getDefaultBusinessHours()
  const slots = calculateAvailableSlots(busyPeriods, date, timezone, durationMinutes, businessHours)

  return {
    date,
    timezone,
    slots: slots.filter(s => s.available)
  }
})
