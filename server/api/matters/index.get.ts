import { desc } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  // Real database check only - mock support to be added if needed
  if (!isDatabaseAvailable()) {
    return []
  }
  
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()
  
  const matters = await db
    .select()
    .from(schema.matters)
    .orderBy(desc(schema.matters.createdAt))
    .all()

  // Convert to snake_case for API compatibility
  return matters.map(matter => ({
    id: matter.id,
    client_id: matter.clientId,
    title: matter.title,
    matter_number: matter.matterNumber,
    description: matter.description,
    status: matter.status,
    lead_attorney_id: matter.leadAttorneyId,
    engagement_journey_id: matter.engagementJourneyId,
    created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
    updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt
  }))
})
