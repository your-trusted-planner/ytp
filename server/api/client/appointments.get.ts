import { eq, gte, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const upcoming = query.upcoming === 'true'
  
  const db = useDrizzle()
  const now = new Date()
  
  let queryBuilder = db
    .select()
    .from(schema.appointments)
    .where(eq(schema.appointments.clientId, user.id))
  
  if (upcoming) {
    queryBuilder = queryBuilder.where(
      gte(schema.appointments.startTime, now)
    ) as any
  }
  
  const appointments = await queryBuilder
    .orderBy(desc(schema.appointments.startTime))
    .all()
  
  return appointments
})

