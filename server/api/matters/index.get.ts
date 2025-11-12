import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  const matters = await db
    .select()
    .from(schema.matters)
    .orderBy(desc(schema.matters.createdAt))
    .all()
  
  return matters
})

