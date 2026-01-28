// Delete a service category (soft delete - sets isActive to false)
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const categoryId = getRouterParam(event, 'id')
  if (!categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Category ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Check category exists
  const existing = await db.select({ id: schema.serviceCategories.id })
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.id, categoryId))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Category not found'
    })
  }

  // Soft delete - set isActive to false
  await db.update(schema.serviceCategories)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(schema.serviceCategories.id, categoryId))

  return { success: true }
})
