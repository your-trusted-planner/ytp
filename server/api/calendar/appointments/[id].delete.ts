import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'
import { deleteCalendarEvent } from '../../../utils/google-calendar'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Appointment ID required' })
  }

  // Workers DELETE body limitation — use query params
  const query = getQuery(event)
  const cancelOnGoogle = query.cancelOnGoogle === 'true'

  const db = useDrizzle()

  const [existing] = await db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.id, id))
    .all()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Appointment not found' })
  }

  // Set status to CANCELLED (soft delete)
  await db
    .update(schema.appointments)
    .set({ status: 'CANCELLED', updatedAt: new Date() })
    .where(eq(schema.appointments.id, id))

  // Optionally delete from Google Calendar
  if (cancelOnGoogle && existing.googleCalendarEventId && existing.googleCalendarEmail) {
    try {
      await deleteCalendarEvent(existing.googleCalendarEmail, existing.googleCalendarEventId)
    } catch (err: any) {
      console.error('Failed to delete Google Calendar event:', err.message)
    }
  }

  // Cancel video meeting if linked
  if (existing.videoMeetingId) {
    try {
      const videoMeeting = await db
        .select()
        .from(schema.videoMeetings)
        .where(eq(schema.videoMeetings.id, existing.videoMeetingId))
        .get()

      if (videoMeeting && videoMeeting.status === 'ACTIVE') {
        const { getVideoProvider } = await import('../../../utils/video-meeting')
        const provider = await getVideoProvider(videoMeeting.provider as 'zoom' | 'google_meet')
        await provider.deleteMeeting(videoMeeting.providerMeetingId!, videoMeeting.hostUserId!, event)

        await db
          .update(schema.videoMeetings)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(eq(schema.videoMeetings.id, existing.videoMeetingId))
      }
    } catch (err: any) {
      console.error('Failed to cancel video meeting:', err.message)
    }
  }

  await logActivity({
    type: 'APPOINTMENT_CANCELLED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment', id, name: existing.title },
    event
  })

  return { success: true }
})
