import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  // Public endpoint — no auth required
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Booking ID required' })
  }

  const db = useDrizzle()

  const [booking] = await db
    .select({
      id: schema.publicBookings.id,
      status: schema.publicBookings.status,
      firstName: schema.publicBookings.firstName,
      lastName: schema.publicBookings.lastName,
      email: schema.publicBookings.email,
      appointmentId: schema.publicBookings.appointmentId,
      selectedSlotStart: schema.publicBookings.selectedSlotStart,
      selectedSlotEnd: schema.publicBookings.selectedSlotEnd,
      timezone: schema.publicBookings.timezone,
      bookingCompletedAt: schema.publicBookings.bookingCompletedAt,
      consultationFeePaid: schema.publicBookings.consultationFeePaid,
      attorneyId: schema.publicBookings.attorneyId,
      appointmentTypeId: schema.publicBookings.appointmentTypeId
    })
    .from(schema.publicBookings)
    .where(eq(schema.publicBookings.id, id))
    .all()

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  // Get appointment details if booked
  let appointment = null
  if (booking.appointmentId) {
    const [appt] = await db
      .select({
        id: schema.appointments.id,
        title: schema.appointments.title,
        startTime: schema.appointments.startTime,
        endTime: schema.appointments.endTime,
        location: schema.appointments.location,
        status: schema.appointments.status
      })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, booking.appointmentId))
      .all()

    if (appt) {
      appointment = {
        id: appt.id,
        title: appt.title,
        startTime: appt.startTime instanceof Date ? appt.startTime.toISOString() : appt.startTime,
        endTime: appt.endTime instanceof Date ? appt.endTime.toISOString() : appt.endTime,
        location: appt.location,
        status: appt.status
      }
    }
  }

  // Get attorney name if assigned
  let attorneyName: string | null = null
  if (booking.attorneyId) {
    const [attorney] = await db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName
      })
      .from(schema.users)
      .where(eq(schema.users.id, booking.attorneyId))
      .all()

    if (attorney) {
      attorneyName = [attorney.firstName, attorney.lastName].filter(Boolean).join(' ')
    }
  }

  // Get appointment type details if present
  let appointmentTypeName: string | null = null
  let eligibleAttorneys: Array<{ id: string; name: string; role: string | null }> = []

  if (booking.appointmentTypeId) {
    const apptType = await db
      .select({
        name: schema.appointmentTypes.name,
        staffEligibility: schema.appointmentTypes.staffEligibility,
        assignedAttorneyIds: schema.appointmentTypes.assignedAttorneyIds
      })
      .from(schema.appointmentTypes)
      .where(eq(schema.appointmentTypes.id, booking.appointmentTypeId))
      .get()

    if (apptType) {
      appointmentTypeName = apptType.name
      const staffEligibility = apptType.staffEligibility || 'any'

      // Include eligible attorneys when no attorney is pre-assigned
      if (!booking.attorneyId) {
        if (staffEligibility === 'specific') {
          const assignedIds: string[] | null = apptType.assignedAttorneyIds
            ? JSON.parse(apptType.assignedAttorneyIds)
            : null

          if (assignedIds && assignedIds.length > 0) {
            const { inArray } = await import('drizzle-orm')
            const attorneys = await db
              .select({
                id: schema.users.id,
                firstName: schema.users.firstName,
                lastName: schema.users.lastName,
                role: schema.users.role
              })
              .from(schema.users)
              .where(inArray(schema.users.id, assignedIds))
              .all()

            eligibleAttorneys = attorneys.map(a => ({
              id: a.id,
              name: [a.firstName, a.lastName].filter(Boolean).join(' '),
              role: a.role
            }))
          }
        } else {
          // 'any' or 'attorneys_only' — get all with calendars
          const calendars = await db
            .select({
              attorneyId: schema.attorneyCalendars.attorneyId,
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              role: schema.users.role
            })
            .from(schema.attorneyCalendars)
            .innerJoin(schema.users, eq(schema.attorneyCalendars.attorneyId, schema.users.id))
            .where(eq(schema.attorneyCalendars.isActive, true))
            .all()

          const seen = new Set<string>()
          eligibleAttorneys = calendars
            .filter(c => {
              if (seen.has(c.attorneyId)) return false
              seen.add(c.attorneyId)
              if (staffEligibility === 'attorneys_only' && c.role !== 'LAWYER') return false
              return true
            })
            .map(c => ({
              id: c.attorneyId,
              name: [c.firstName, c.lastName].filter(Boolean).join(' '),
              role: c.role
            }))
        }
      }
    }
  }

  return {
    id: booking.id,
    status: booking.status,
    firstName: booking.firstName,
    lastName: booking.lastName,
    email: booking.email,
    consultationFeePaid: booking.consultationFeePaid,
    selectedSlotStart: booking.selectedSlotStart,
    selectedSlotEnd: booking.selectedSlotEnd,
    timezone: booking.timezone,
    attorneyId: booking.attorneyId,
    attorneyName,
    appointmentTypeId: booking.appointmentTypeId,
    appointmentTypeName,
    eligibleAttorneys,
    appointment
  }
})
