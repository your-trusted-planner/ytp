import { z } from 'zod'
import { useDrizzle, schema } from '../../../db'
import { generateId } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity-logger'
import { createCalendarEvent } from '../../../utils/google-calendar'
import { eq } from 'drizzle-orm'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(), // ISO 8601
  endTime: z.string(),
  location: z.string().optional(),
  locationConfig: z.string().optional(), // JSON LocationConfig
  roomId: z.string().optional(),
  timezone: z.string().default('America/New_York'),
  clientId: z.string().optional(),
  matterId: z.string().optional(),
  appointmentType: z.enum(['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']).default('MEETING'),
  appointmentTypeId: z.string().optional(),
  attendeeIds: z.array(z.string()).default([]),
  syncToGoogle: z.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const data = parsed.data
  const db = useDrizzle()
  const appointmentId = generateId()

  let googleCalendarEventId: string | null = null
  let googleCalendarEmail: string | null = null

  // Sync to Google Calendar if requested
  if (data.syncToGoogle) {
    // Find the creator's primary calendar
    const [calendar] = await db
      .select()
      .from(schema.attorneyCalendars)
      .where(eq(schema.attorneyCalendars.attorneyId, user.id))
      .all()

    if (calendar) {
      // Build attendee list from attendeeIds
      const attendeeEmails: Array<{ email: string, displayName?: string }> = []
      if (data.attendeeIds.length > 0) {
        const attendeeUsers = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName
          })
          .from(schema.users)
          .all()

        for (const uid of data.attendeeIds) {
          const u = attendeeUsers.find(au => au.id === uid)
          if (u?.email) {
            attendeeEmails.push({
              email: u.email,
              displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || undefined
            })
          }
        }
      }

      try {
        const gcalEvent = await createCalendarEvent(calendar.calendarEmail, {
          summary: data.title,
          description: data.description,
          start: { dateTime: data.startTime, timeZone: data.timezone },
          end: { dateTime: data.endTime, timeZone: data.timezone },
          location: data.location,
          attendees: attendeeEmails.length > 0 ? attendeeEmails : undefined
        })

        googleCalendarEventId = gcalEvent.id || null
        googleCalendarEmail = calendar.calendarEmail
      }
      catch (err: any) {
        console.error('Failed to create Google Calendar event:', err.message)
        // Continue without Google sync — appointment still created in DB
      }
    }
  }

  // Handle video meeting creation if locationConfig indicates video
  let videoMeetingId: string | null = null
  let resolvedLocation = data.location || null

  console.log('[Appointment] locationConfig:', data.locationConfig, '| location:', data.location)

  if (data.locationConfig) {
    try {
      const config = JSON.parse(data.locationConfig)
      if (config.type === 'video' && config.provider) {
        const { getVideoProvider } = await import('../../../utils/video-meeting')
        try {
          const provider = await getVideoProvider(config.provider)
          const durationMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime()
          const durationMinutes = Math.round(durationMs / 60000)

          const meeting = await provider.createMeeting({
            topic: data.title,
            startTime: data.startTime,
            durationMinutes,
            timezone: data.timezone,
            hostUserId: user.id,
            description: data.description,
            event
          })

          // Store video meeting record
          const vmId = generateId()
          await db.insert(schema.videoMeetings).values({
            id: vmId,
            appointmentId,
            provider: config.provider,
            providerMeetingId: meeting.providerMeetingId,
            hostUserId: user.id,
            joinUrl: meeting.joinUrl,
            hostUrl: meeting.hostUrl,
            passcode: meeting.passcode || null,
            status: 'ACTIVE',
            providerData: meeting.providerData ? JSON.stringify(meeting.providerData) : null,
            createdAt: new Date(),
            updatedAt: new Date()
          })

          videoMeetingId = vmId
          resolvedLocation = meeting.joinUrl
        }
        catch (err: any) {
          console.error('Failed to create video meeting:', err.message)
          // Continue without video meeting — appointment still created
        }
      }
    }
    catch { /* ignore parse errors */ }
  }

  await db.insert(schema.appointments).values({
    id: appointmentId,
    title: data.title,
    description: data.description || null,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    location: resolvedLocation,
    locationConfig: data.locationConfig || null,
    roomId: data.roomId || null,
    videoMeetingId,
    clientId: data.clientId || null,
    matterId: data.matterId || null,
    appointmentType: data.appointmentType,
    appointmentTypeId: data.appointmentTypeId || null,
    attendeeIds: data.attendeeIds.length > 0 ? JSON.stringify(data.attendeeIds) : null,
    createdById: user.id,
    googleCalendarEventId,
    googleCalendarEmail,
    status: 'CONFIRMED'
  })

  await logActivity({
    type: 'APPOINTMENT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment', id: appointmentId, name: data.title },
    event,
    details: {
      appointmentType: data.appointmentType,
      syncedToGoogle: !!googleCalendarEventId,
      videoMeetingCreated: !!videoMeetingId
    }
  })

  return {
    success: true,
    appointmentId,
    googleCalendarEventId,
    videoMeetingId
  }
})
