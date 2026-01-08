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

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Soft delete by setting is_active to false
  await db.update(schema.journeys)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(schema.journeys.id, journeyId))

  return { success: true }
})



