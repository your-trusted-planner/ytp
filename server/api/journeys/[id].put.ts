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

  await db.prepare(`
    UPDATE journeys
    SET
      name = ?,
      description = ?,
      service_catalog_id = ?,
      is_active = ?,
      estimated_duration_days = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.name,
    body.description || null,
    body.serviceCatalogId || null,
    body.isActive ? 1 : 0,
    body.estimatedDurationDays || null,
    Date.now(),
    journeyId
  ).run()

  return { success: true }
})



