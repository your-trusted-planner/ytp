import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
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
  
  return appointments
})

