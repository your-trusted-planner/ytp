// Delete a journey step
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const stepId = getRouterParam(event, 'id')

  if (!stepId) {
    throw createError({
      statusCode: 400,
      message: 'Step ID is required'
    })
  }

  const db = hubDatabase()

  // Hard delete the step (cascade will handle related records)
  await db.prepare(`
    DELETE FROM journey_steps WHERE id = ?
  `).bind(stepId).run()

  return { success: true }
})



