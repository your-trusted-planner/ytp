// Delete a journey (soft delete - set inactive)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const journeyId = getRouterParam(event, 'id')

  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const db = hubDatabase()

  // Soft delete by setting is_active to false
  await db.prepare(`
    UPDATE journeys 
    SET is_active = 0, updated_at = ?
    WHERE id = ?
  `).bind(Date.now(), journeyId).run()

  return { success: true }
})



