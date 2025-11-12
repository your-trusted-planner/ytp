import { desc } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../database'
import { requireRole } from '../../utils/auth'
import { mockDb, initMockMatters } from '../../utils/mock-db'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    await initMockMatters()
    return await mockDb.matters.getAll()
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  
  const matters = await db
    .select()
    .from(schema.matters)
    .orderBy(desc(schema.matters.createdAt))
    .all()
  
  return matters
})



