// Delete a journey step
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const stepId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can delete journey steps
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

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



