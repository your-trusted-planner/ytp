// Reorder service categories
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const body = await readBody(event)

  if (!Array.isArray(body.categoryIds)) {
    throw createError({
      statusCode: 400,
      message: 'categoryIds array is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const now = new Date()

  // Update display order for each category
  for (let i = 0; i < body.categoryIds.length; i++) {
    await db.update(schema.serviceCategories)
      .set({
        displayOrder: i + 1,
        updatedAt: now
      })
      .where(eq(schema.serviceCategories.id, body.categoryIds[i]))
  }

  return { success: true }
})
