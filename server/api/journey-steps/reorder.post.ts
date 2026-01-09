// Reorder journey steps
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // body.steps should be array of { id, order }
  if (!Array.isArray(body.steps)) {
    throw createError({
      statusCode: 400,
      message: 'Steps array is required'
    })
  }

  const now = new Date()

  // Update each step's order
  for (const step of body.steps) {
    await db.update(schema.journeySteps)
      .set({
        stepOrder: step.order,
        updatedAt: now
      })
      .where(eq(schema.journeySteps.id, step.id))
  }

  return { success: true }
})



