import { eq, and, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const query = getQuery(event)
  const upcoming = query.upcoming === 'true'

  const db = useDrizzle()
  const now = new Date()

  const conditions = [eq(schema.appointments.clientId, user.id)]
  if (upcoming) {
    conditions.push(gte(schema.appointments.startTime, now))
  }

  const appointments = await db
    .select()
    .from(schema.appointments)
    .where(and(...conditions))
    .orderBy(desc(schema.appointments.startTime))
    .all()

  return appointments
})
