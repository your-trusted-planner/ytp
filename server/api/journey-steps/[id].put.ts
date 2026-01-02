// Update a journey step
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const stepId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can update journey steps
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

  const body = await readBody(event)
  const db = hubDatabase()

  await db.prepare(`
    UPDATE journey_steps 
    SET 
      step_type = ?,
      name = ?,
      description = ?,
      step_order = ?,
      responsible_party = ?,
      expected_duration_days = ?,
      automation_config = ?,
      help_content = ?,
      allow_multiple_iterations = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.stepType || 'MILESTONE',
    body.name,
    body.description || null,
    body.stepOrder || 0,
    body.responsibleParty || 'CLIENT',
    body.expectedDurationDays || null,
    body.automationConfig ? JSON.stringify(body.automationConfig) : null,
    body.helpContent || null,
    body.allowMultipleIterations ? 1 : 0,
    Date.now(),
    stepId
  ).run()

  return { success: true }
})



