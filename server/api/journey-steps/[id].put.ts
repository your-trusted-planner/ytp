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
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  await db.update(schema.journeySteps)
    .set({
      stepType: body.stepType || 'MILESTONE',
      name: body.name,
      description: body.description || null,
      stepOrder: body.stepOrder || 0,
      responsibleParty: body.responsibleParty || 'CLIENT',
      expectedDurationDays: body.expectedDurationDays || null,
      automationConfig: body.automationConfig ? JSON.stringify(body.automationConfig) : null,
      helpContent: body.helpContent || null,
      allowMultipleIterations: body.allowMultipleIterations ? true : false,
      isFinalStep: body.isFinalStep ? true : false,
      requiresVerification: body.requiresVerification ? true : false,
      updatedAt: new Date()
    })
    .where(eq(schema.journeySteps.id, stepId))

  return { success: true }
})



