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

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Hard delete the step (cascade will handle related records)
  await db.delete(schema.journeySteps)
    .where(eq(schema.journeySteps.id, stepId))

  return { success: true }
})



