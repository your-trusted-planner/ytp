import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  const activities = await db
    .select()
    .from(schema.activities)
    .orderBy(desc(schema.activities.createdAt))
    .limit(10)
    .all()

  // Convert to snake_case for API compatibility
  return activities.map(activity => ({
    id: activity.id,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata,
    user_id: activity.userId,
    created_at: activity.createdAt instanceof Date ? activity.createdAt.getTime() : activity.createdAt
  }))
})

