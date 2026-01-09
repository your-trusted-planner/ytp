// Create a new journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Validate journey type
  const journeyType = body.journeyType || 'SERVICE'
  if (!['ENGAGEMENT', 'SERVICE'].includes(journeyType)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid journey type. Must be ENGAGEMENT or SERVICE'
    })
  }

  const journeyId = nanoid()
  const now = new Date()

  await db.insert(schema.journeys).values({
    id: journeyId,
    serviceCatalogId: body.serviceCatalogId || null,
    name: body.name,
    description: body.description || null,
    journeyType: journeyType,
    isActive: true,
    estimatedDurationDays: body.estimatedDurationDays || null,
    createdAt: now,
    updatedAt: now
  })

  // Return journey object for compatibility
  return {
    journey: {
      id: journeyId,
      service_catalog_id: body.serviceCatalogId || null,
      name: body.name,
      description: body.description || null,
      journey_type: journeyType,
      is_active: 1,
      estimated_duration_days: body.estimatedDurationDays || null,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})



