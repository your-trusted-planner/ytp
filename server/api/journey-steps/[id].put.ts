// Update a journey step
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const stepId = getRouterParam(event, 'id')

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
      is_final_step = ?,
      requires_verification = ?,
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
    body.isFinalStep ? 1 : 0,
    body.requiresVerification ? 1 : 0,
    Date.now(),
    stepId
  ).run()

  return { success: true }
})



