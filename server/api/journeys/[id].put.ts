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
  const db = hubDatabase()

  // Validate journey type if provided
  if (body.journeyType && !['ENGAGEMENT', 'SERVICE'].includes(body.journeyType)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid journey type. Must be ENGAGEMENT or SERVICE'
    })
  }

  await db.prepare(`
    UPDATE journeys
    SET
      name = ?,
      description = ?,
      service_catalog_id = ?,
      journey_type = ?,
      is_active = ?,
      estimated_duration_days = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.name,
    body.description || null,
    body.serviceCatalogId || null,
    body.journeyType || 'SERVICE',
    body.isActive ? 1 : 0,
    body.estimatedDurationDays || null,
    Date.now(),
    journeyId
  ).run()

  return { success: true }
})



