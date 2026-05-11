import { eq, and, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)
  const query = getQuery(event)
  const upcoming = query.upcoming === 'true'

  const db = useDrizzle()
  const now = new Date()

  // appointments.clientId now references clients.id — resolve the CLIENT
  // caller's client record from their personId.
  if (!user.personId) return []
  const clientRecord = await db.select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.personId, user.personId))
    .get()
  if (!clientRecord) return []

  const conditions = [eq(schema.appointments.clientId, clientRecord.id)]
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
