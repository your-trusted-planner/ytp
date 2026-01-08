import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const db = useDrizzle()

  // If lawyer/admin, get all appointments. If client, get only their appointments
  let appointments
  if (user.role === 'LAWYER' || user.role === 'ADMIN') {
    appointments = await db
      .select()
      .from(schema.appointments)
      .orderBy(desc(schema.appointments.startTime))
      .all()
  } else {
    appointments = await db
      .select()
      .from(schema.appointments)
      .where(eq(schema.appointments.clientId, user.id))
      .orderBy(desc(schema.appointments.startTime))
      .all()
  }

  // Convert to snake_case for API compatibility
  return appointments.map(appt => ({
    id: appt.id,
    title: appt.title,
    description: appt.description,
    start_time: appt.startTime instanceof Date ? appt.startTime.getTime() : appt.startTime,
    end_time: appt.endTime instanceof Date ? appt.endTime.getTime() : appt.endTime,
    status: appt.status,
    location: appt.location,
    notes: appt.notes,
    pre_call_notes: appt.preCallNotes,
    call_notes: appt.callNotes,
    call_notes_updated_at: appt.callNotesUpdatedAt instanceof Date ? appt.callNotesUpdatedAt.getTime() : appt.callNotesUpdatedAt,
    client_id: appt.clientId,
    created_at: appt.createdAt instanceof Date ? appt.createdAt.getTime() : appt.createdAt,
    updated_at: appt.updatedAt instanceof Date ? appt.updatedAt.getTime() : appt.updatedAt
  }))
})

