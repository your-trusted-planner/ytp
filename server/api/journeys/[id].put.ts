// Update a journey
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const journeyId = getRouterParam(event, 'id')

  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Validate journey type if provided
  if (body.journeyType && !['ENGAGEMENT', 'SERVICE'].includes(body.journeyType)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid journey type. Must be ENGAGEMENT or SERVICE'
    })
  }

  await db.update(schema.journeys)
    .set({
      name: body.name,
      description: body.description || null,
      serviceCatalogId: body.serviceCatalogId || null,
      journeyType: body.journeyType || 'SERVICE',
      isActive: body.isActive ? true : false,
      estimatedDurationDays: body.estimatedDurationDays || null,
      updatedAt: new Date()
    })
    .where(eq(schema.journeys.id, journeyId))

  return { success: true }
})



