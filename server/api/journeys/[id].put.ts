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

  const now = new Date()

  // Update journey metadata
  await db.update(schema.journeys)
    .set({
      name: body.name,
      description: body.description || null,
      journeyType: body.journeyType || 'SERVICE',
      isActive: body.isActive ? true : false,
      estimatedDurationDays: body.estimatedDurationDays || null,
      updatedAt: now
    })
    .where(eq(schema.journeys.id, journeyId))

  // Update catalog links if provided (many-to-many)
  // Accept either catalogIds array or legacy serviceCatalogId
  if (body.catalogIds !== undefined || body.serviceCatalogId !== undefined) {
    const catalogIds: string[] = body.catalogIds || (body.serviceCatalogId ? [body.serviceCatalogId] : [])

    // Delete existing links
    await db.delete(schema.journeysToCatalog)
      .where(eq(schema.journeysToCatalog.journeyId, journeyId))

    // Insert new links
    if (catalogIds.length > 0) {
      await db.insert(schema.journeysToCatalog).values(
        catalogIds.map(catalogId => ({
          journeyId,
          catalogId,
          createdAt: now
        }))
      )
    }
  }

  return { success: true }
})



