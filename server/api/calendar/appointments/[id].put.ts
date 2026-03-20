import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'
import { updateCalendarEvent } from '../../../utils/google-calendar'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  locationConfig: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  timezone: z.string().default('America/New_York'),
  clientId: z.string().nullable().optional(),
  matterId: z.string().nullable().optional(),
  appointmentType: z.enum(['CONSULTATION', 'MEETING', 'CALL', 'FOLLOW_UP', 'SIGNING', 'OTHER']).optional(),
  appointmentTypeId: z.string().nullable().optional(),
  attendeeIds: z.array(z.string()).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Appointment ID required' })
  }

  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const data = parsed.data
  const db = useDrizzle()

  // Get existing appointment
  const [existing] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.id, id))
    .all()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Appointment not found' })
  }

  // Build update object
  const updates: any = {
    updatedAt: new Date()
  }

  if (data.title !== undefined) updates.title = data.title
  if (data.description !== undefined) updates.description = data.description
  if (data.startTime !== undefined) updates.startTime = new Date(data.startTime)
  if (data.endTime !== undefined) updates.endTime = new Date(data.endTime)
  if (data.location !== undefined) updates.location = data.location
  if (data.locationConfig !== undefined) updates.locationConfig = data.locationConfig
  if (data.roomId !== undefined) updates.roomId = data.roomId
  if (data.clientId !== undefined) updates.clientId = data.clientId
  if (data.matterId !== undefined) updates.matterId = data.matterId
  if (data.appointmentType !== undefined) updates.appointmentType = data.appointmentType
  if (data.appointmentTypeId !== undefined) updates.appointmentTypeId = data.appointmentTypeId
  if (data.status !== undefined) updates.status = data.status
  if (data.attendeeIds !== undefined) updates.attendeeIds = JSON.stringify(data.attendeeIds)

  await db.update(schema.appointments).set(updates).where(eq(schema.appointments.id, id))

  // Sync changes to Google Calendar if linked
  if (existing.googleCalendarEventId && existing.googleCalendarEmail) {
    try {
      const gcalUpdate: any = {}
      if (data.title) gcalUpdate.summary = data.title
      if (data.description !== undefined) gcalUpdate.description = data.description
      if (data.startTime) gcalUpdate.start = { dateTime: data.startTime, timeZone: data.timezone }
      if (data.endTime) gcalUpdate.end = { dateTime: data.endTime, timeZone: data.timezone }
      if (data.location !== undefined) gcalUpdate.location = data.location

      if (Object.keys(gcalUpdate).length > 0) {
        await updateCalendarEvent(existing.googleCalendarEmail, existing.googleCalendarEventId, gcalUpdate)
      }
    }
    catch (err: any) {
      console.error('Failed to update Google Calendar event:', err.message)
    }
  }

  // Sync changes to video meeting if linked and time changed
  if (existing.videoMeetingId && (data.startTime || data.endTime || data.title)) {
    try {
      const videoMeeting = await db
        .select()
        .from(schema.videoMeetings)
        .where(eq(schema.videoMeetings.id, existing.videoMeetingId))
        .get()

      if (videoMeeting && videoMeeting.status === 'ACTIVE') {
        const { getVideoProvider } = await import('../../../utils/video-meeting')
        const provider = await getVideoProvider(videoMeeting.provider as 'zoom' | 'google_meet')

        const effectiveStart = data.startTime || existing.startTime.toISOString()
        const effectiveEnd = data.endTime || existing.endTime.toISOString()
        const durationMs = new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime()

        await provider.updateMeeting(
          videoMeeting.providerMeetingId!,
          videoMeeting.hostUserId!,
          {
            topic: data.title,
            startTime: data.startTime,
            durationMinutes: Math.round(durationMs / 60000),
            timezone: data.timezone
          },
          event
        )

        await db
          .update(schema.videoMeetings)
          .set({ status: 'UPDATED', updatedAt: new Date() })
          .where(eq(schema.videoMeetings.id, existing.videoMeetingId))
      }
    }
    catch (err: any) {
      console.error('Failed to update video meeting:', err.message)
    }
  }

  await logActivity({
    type: 'APPOINTMENT_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment', id, name: data.title || existing.title },
    event
  })

  return { success: true }
})
