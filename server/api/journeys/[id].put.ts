// Update a journey
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const journeyId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can update journeys
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

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
      matter_id = ?,
      is_template = ?,
      is_active = ?,
      estimated_duration_days = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.name,
    body.description || null,
    body.matterId || null,
    body.isTemplate ? 1 : 0,
    body.isActive ? 1 : 0,
    body.estimatedDurationDays || null,
    Date.now(),
    journeyId
  ).run()

  return { success: true }
})



