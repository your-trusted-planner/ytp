import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../database'
import { generateId } from '../../../utils/auth'

const addServiceSchema = z.object({
  catalogId: z.string().min(1),
  assignedAttorneyId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])
  
  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID required'
    })
  }
  
  const body = await readBody(event)
  const result = addServiceSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }
  
  const { catalogId, assignedAttorneyId } = result.data

  if (!isDatabaseAvailable()) {
    return { success: true } // Mock response
  }

  const { useDrizzle, schema } = await import('../../../database')
  const db = useDrizzle()

  // Verify the catalog item exists
  const results = await db.select().from(schema.serviceCatalog).where(eq(schema.serviceCatalog.id, catalogId)).all()
  const catalogItem = results[0]

  if (!catalogItem) {
    throw createError({ statusCode: 404, message: 'Service not found in catalog' })
  }

  // Check if this engagement already exists
  const existing = await db
    .select()
    .from(schema.mattersToServices)
    .where(eq(schema.mattersToServices.matterId, matterId))
    .where(eq(schema.mattersToServices.catalogId, catalogId))
    .all()

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'This service is already engaged for this matter'
    })
  }

  const newEngagement = {
    matterId,
    catalogId,
    engagedAt: new Date(),
    assignedAttorneyId: assignedAttorneyId || null,
    status: 'PENDING' as const,
    startDate: null,
    endDate: null
  }

  await db.insert(schema.mattersToServices).values(newEngagement)

  return { success: true, engagement: newEngagement }
})

