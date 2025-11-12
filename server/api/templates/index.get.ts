import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const db = useDrizzle()
  
  const templates = await db
    .select()
    .from(schema.documentTemplates)
    .orderBy(desc(schema.documentTemplates.createdAt))
    .all()
  
  return templates
})

