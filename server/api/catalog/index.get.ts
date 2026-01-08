import { desc } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { requireRole } from '../../utils/auth'
import { mockDb, initMockMatters } from '../../utils/mock-db'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    await initMockMatters()
    const matters = await mockDb.matters.getAll()
    return { services: matters }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()
  
  const catalog = await db
    .select()
    .from(schema.serviceCatalog)
    .orderBy(desc(schema.serviceCatalog.createdAt))
    .all()
  
  return { services: catalog }
})


