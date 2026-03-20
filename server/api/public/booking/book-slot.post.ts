import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { generateId } from '../../../utils/auth'
import { getFreeBusy, getMultiCalendarFreeBusy } from '../../../utils/google-calendar'
import { createCalendarEvent } from '../../../utils/google-calendar'

const bookSchema = z.object({
  bookingId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string().default('America/New_York')
})

export default defineEventHandler(async (event) => {
  // Public endpoint — no auth required
  const body = await readBody(event)
  const parsed = bookSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid booking data' })
  }

  const { bookingId, startTime, endTime, timezone } = parsed.data
  const db = useDrizzle()

  // Get the booking
  const [booking] = await db
    .select()
    .from(schema.publicBookings)
    .where(eq(schema.publicBookings.id, bookingId))
    .all()

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  if (booking.status === 'BOOKED') {
    throw createError({ statusCode: 400, message: 'This booking already has an appointment scheduled' })
  }

  if (booking.status === 'CANCELLED') {
    throw createError({ statusCode: 400, message: 'This booking has been cancelled' })
  }

  // Get attorney's calendar
  let calendarEmail: string | null = null
  if (booking.attorneyId) {
    const [calendar] = await db
      .select()
      .from(schema.attorneyCalendars)
      .where(eq(schema.attorneyCalendars.attorneyId, booking.attorneyId))
      .all()

    if (calendar) {
      calendarEmail = calendar.calendarEmail

      // Build list of calendars for double-check: attorney + optional room
      const checkEmails = [calendarEmail]

      // Check if appointment type has a room with a calendar resource
      if (booking.appointmentTypeId) {
        const apptType = await db
          .select({ defaultLocationConfig: schema.appointmentTypes.defaultLocationConfig })
          .from(schema.appointmentTypes)
          .where(eq(schema.appointmentTypes.id, booking.appointmentTypeId))
          .get()

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
                checkEmails.push(room.calendarEmail)
              }
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Double-check availability to prevent double-booking
      try {
        const busyPeriods = checkEmails.length > 1
          ? await getMultiCalendarFreeBusy(calendarEmail, checkEmails, startTime, endTime)
          : await getFreeBusy(calendarEmail, startTime, endTime)

        if (busyPeriods.length > 0) {
          throw createError({ statusCode: 409, message: 'This time slot is no longer available. Please select a different time.' })
        }
      } catch (err: any) {
        if (err.statusCode === 409) throw err
        console.error('Failed to verify availability:', err.message)
      }
    }
  }

  // Create appointment
  const appointmentId = generateId()
  const clientName = [booking.firstName, booking.lastName].filter(Boolean).join(' ') || booking.email

  // Resolve type-level settings
  let typeName = 'Consultation'
  let defaultLocation = 'Zoom (link will be sent)'
  let legacyType: 'CONSULTATION' | 'MEETING' | 'CALL' | 'FOLLOW_UP' | 'SIGNING' | 'OTHER' = 'CONSULTATION'
  let locationConfig: string | null = null
  let roomId: string | null = null

  if (booking.appointmentTypeId) {
    const apptType = await db
      .select()
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, booking.appointmentTypeId))
      .get()

    if (apptType) {
      typeName = apptType.name

      // Use structured location config if available, else fall back to defaultLocation
      if (apptType.defaultLocationConfig) {
        try {
          const config = JSON.parse(apptType.defaultLocationConfig)
          locationConfig = apptType.defaultLocationConfig

          if (config.type === 'room' && config.roomId) {
            roomId = config.roomId
            // Resolve room name for display string
            const room = await db
              .select({ name: schema.rooms.name, building: schema.rooms.building })
              .from(schema.rooms)
              .where(eq(schema.rooms.id, config.roomId))
              .get()
            if (room) {
              defaultLocation = room.building ? `${room.name}, ${room.building}` : room.name
            }
          } else if (config.type === 'custom' && config.text) {
            defaultLocation = config.text
          }
        } catch { /* fall through to legacy */ }
      } else if (apptType.defaultLocation) {
        defaultLocation = apptType.defaultLocation
      }
    }
  }

  await db.insert(schema.appointments).values({
    id: appointmentId,
    title: `${typeName}: ${clientName}`,
    description: `${typeName} booking for ${clientName} (${booking.email})`,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    location: defaultLocation,
    locationConfig,
    roomId,
    status: 'CONFIRMED',
    appointmentType: legacyType,
    appointmentTypeId: booking.appointmentTypeId || null,
    clientId: booking.userId || null,
    createdById: booking.attorneyId || null
  })

  // Create Google Calendar event
  let googleCalendarEventId: string | null = null
  if (calendarEmail) {
    try {
      const gcalEvent = await createCalendarEvent(calendarEmail, {
        summary: `${typeName}: ${clientName}`,
        description: `Booking ID: ${bookingId}\nEmail: ${booking.email}\nPhone: ${booking.phone || 'N/A'}`,
        start: { dateTime: startTime, timeZone: timezone },
        end: { dateTime: endTime, timeZone: timezone },
        attendees: [{ email: booking.email, displayName: clientName }]
      })

      googleCalendarEventId = gcalEvent.id || null

      // Update appointment with Google link
      if (googleCalendarEventId) {
        await db
          .update(schema.appointments)
          .set({ googleCalendarEventId, googleCalendarEmail: calendarEmail })
          .where(eq(schema.appointments.id, appointmentId))
      }
    } catch (err: any) {
      console.error('Failed to create Google Calendar event for booking:', err.message)
    }
  }

  // Update booking status
  await db
    .update(schema.publicBookings)
    .set({
      status: 'BOOKED',
      appointmentId,
      selectedSlotStart: new Date(startTime),
      selectedSlotEnd: new Date(endTime),
      timezone,
      bookingCompletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.publicBookings.id, bookingId))

  return {
    success: true,
    appointmentId,
    startTime,
    endTime,
    timezone
  }
})
