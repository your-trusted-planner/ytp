import { z } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { listCalendarEvents } from '../../utils/google-calendar'
import type { CalendarEvent } from '../../utils/google-calendar'

const querySchema = z.object({
  timeMin: z.string(),
  timeMax: z.string(),
  attorneyIds: z.string().optional(),
  view: z.enum(['team', 'individual']).default('team')
})

interface StaffAttendee {
  userId: string
  firstName: string
  lastName: string
  avatar: string | null
  email: string
}

interface TeamEvent {
  id: string
  source: 'google' | 'ytp' | 'both'
  ytpAppointmentId?: string
  title: string
  startTime: string
  endTime: string
  location?: string
  isAllDay: boolean
  staffAttendees: StaffAttendee[]
  clientName?: string
  matterId?: string
  matterTitle?: string
  appointmentType?: string
  appointmentTypeId?: string
  status?: string
  description?: string
}

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const query = getQuery(event)
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'timeMin and timeMax are required' })
  }

  const { timeMin, timeMax, attorneyIds, view } = parsed.data
  const db = useDrizzle()

  // Get active attorney calendars
  let calendars = await db
    .select({
      id: schema.attorneyCalendars.id,
      attorneyId: schema.attorneyCalendars.attorneyId,
      calendarEmail: schema.attorneyCalendars.calendarEmail,
      calendarName: schema.attorneyCalendars.calendarName
    })
    .from(schema.attorneyCalendars)
    .where(eq(schema.attorneyCalendars.isActive, true))
    .all()

  // Filter by attorney IDs if provided
  if (attorneyIds) {
    const ids = attorneyIds.split(',').map(id => id.trim())
    calendars = calendars.filter(c => ids.includes(c.attorneyId))
  }

  // For individual view, only show the requesting user's calendar
  if (view === 'individual') {
    calendars = calendars.filter(c => c.attorneyId === user.id)
  }

  if (calendars.length === 0) {
    return { events: [] }
  }

  // Build a map of attorney ID → staff info
  const attorneyUserIds = [...new Set(calendars.map(c => c.attorneyId))]
  const staffUsers = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
      avatar: schema.users.avatar
    })
    .from(schema.users)
    .where(inArray(schema.users.id, attorneyUserIds))
    .all()

  const staffMap = new Map(staffUsers.map(u => [u.id, u]))

  // Also build email → userId map for matching attendees
  const emailToAttorneyId = new Map<string, string>()
  for (const cal of calendars) {
    emailToAttorneyId.set(cal.calendarEmail.toLowerCase(), cal.attorneyId)
  }
  for (const u of staffUsers) {
    if (u.email) emailToAttorneyId.set(u.email.toLowerCase(), u.id)
  }

  // Fetch Google Calendar events in parallel for each unique email
  const uniqueEmails = [...new Set(calendars.map(c => c.calendarEmail))]
  const googleEventsByEmail = new Map<string, CalendarEvent[]>()

  const fetchResults = await Promise.allSettled(
    uniqueEmails.map(async (email) => {
      const events = await listCalendarEvents(email, timeMin, timeMax)
      return { email, events }
    })
  )

  for (let i = 0; i < fetchResults.length; i++) {
    const result = fetchResults[i]
    if (result.status === 'fulfilled') {
      googleEventsByEmail.set(result.value.email, result.value.events)
    } else {
      console.error(`Failed to fetch Google Calendar events for ${uniqueEmails[i]}:`, result.reason?.message || result.reason)
    }
  }

  // Dedup logic: group by Google Calendar event ID
  const eventMap = new Map<string, TeamEvent>()

  for (const cal of calendars) {
    const events = googleEventsByEmail.get(cal.calendarEmail) || []
    const staffInfo = staffMap.get(cal.attorneyId)

    const attendee: StaffAttendee = {
      userId: cal.attorneyId,
      firstName: staffInfo?.firstName || '',
      lastName: staffInfo?.lastName || '',
      avatar: staffInfo?.avatar || null,
      email: cal.calendarEmail
    }

    for (const gEvent of events) {
      const eventId = gEvent.id || gEvent.iCalUID || `${cal.calendarEmail}:${gEvent.summary}:${gEvent.start?.dateTime || gEvent.start?.date}`
      const isAllDay = !gEvent.start?.dateTime && !!gEvent.start?.date

      if (eventMap.has(eventId)) {
        // Add this staff member as attendee if not already present
        const existing = eventMap.get(eventId)!
        if (!existing.staffAttendees.some(a => a.userId === attendee.userId)) {
          existing.staffAttendees.push(attendee)
        }
      } else {
        eventMap.set(eventId, {
          id: eventId,
          source: 'google',
          title: gEvent.summary || '(No title)',
          startTime: gEvent.start?.dateTime || gEvent.start?.date || '',
          endTime: gEvent.end?.dateTime || gEvent.end?.date || '',
          location: gEvent.location,
          isAllDay,
          staffAttendees: [attendee],
          description: gEvent.description
        })
      }
    }
  }

  // Merge YTP-only appointments (those without Google Calendar link, or to enrich existing)
  const ytpAppointments = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        // Filter by time range — approximated with unix timestamp comparison
        // Appointments in our DB are stored as timestamps
      )
    )
    .all()

  // Filter appointments by time range in JS (since we're comparing Date objects)
  const rangeStart = new Date(timeMin)
  const rangeEnd = new Date(timeMax)
  const relevantAppointments = ytpAppointments.filter(a => {
    const start = a.startTime instanceof Date ? a.startTime : new Date(a.startTime as any)
    return start >= rangeStart && start <= rangeEnd && a.status !== 'CANCELLED'
  })

  for (const appt of relevantAppointments) {
    const startTime = appt.startTime instanceof Date ? appt.startTime.toISOString() : new Date(appt.startTime as any).toISOString()
    const endTime = appt.endTime instanceof Date ? appt.endTime.toISOString() : new Date(appt.endTime as any).toISOString()

    if (appt.googleCalendarEventId && eventMap.has(appt.googleCalendarEventId)) {
      // Enrich existing Google event with YTP data
      const existing = eventMap.get(appt.googleCalendarEventId)!
      existing.source = 'both'
      existing.ytpAppointmentId = appt.id
      existing.appointmentType = appt.appointmentType || undefined
      existing.appointmentTypeId = appt.appointmentTypeId || undefined
      existing.status = appt.status
      if (appt.matterId) existing.matterId = appt.matterId
    } else {
      // YTP-only appointment
      const attendees: StaffAttendee[] = []
      if (appt.attendeeIds) {
        try {
          const ids = JSON.parse(appt.attendeeIds) as string[]
          for (const id of ids) {
            const staff = staffMap.get(id)
            if (staff) {
              attendees.push({
                userId: id,
                firstName: staff.firstName || '',
                lastName: staff.lastName || '',
                avatar: staff.avatar || null,
                email: staff.email || ''
              })
            }
          }
        } catch {}
      }
      // If no attendees parsed, try createdById
      if (attendees.length === 0 && appt.createdById) {
        const staff = staffMap.get(appt.createdById)
        if (staff) {
          attendees.push({
            userId: appt.createdById,
            firstName: staff.firstName || '',
            lastName: staff.lastName || '',
            avatar: staff.avatar || null,
            email: staff.email || ''
          })
        }
      }

      eventMap.set(`ytp:${appt.id}`, {
        id: `ytp:${appt.id}`,
        source: 'ytp',
        ytpAppointmentId: appt.id,
        title: appt.title,
        startTime,
        endTime,
        location: appt.location || undefined,
        isAllDay: false,
        staffAttendees: attendees,
        appointmentType: appt.appointmentType || undefined,
        appointmentTypeId: appt.appointmentTypeId || undefined,
        status: appt.status,
        description: appt.description || undefined,
        matterId: appt.matterId || undefined
      })
    }
  }

  // Sort by start time
  const events = Array.from(eventMap.values()).sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  })

  return { events }
})
