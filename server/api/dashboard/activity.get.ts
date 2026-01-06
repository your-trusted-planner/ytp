import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  const activities = await db
    .select()
    .from(schema.activities)
    .orderBy(desc(schema.activities.createdAt))
    .limit(10)
    .all()
  
  return activities
})

