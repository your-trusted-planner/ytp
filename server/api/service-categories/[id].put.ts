// Update a service category
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const categoryId = getRouterParam(event, 'id')
  if (!categoryId) {
    throw createError({
      statusCode: 400,
      message: 'Category ID is required'
    })
  }

  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Category name is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, ne } = await import('drizzle-orm')
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

  // Check for duplicate name (excluding current category)
  const duplicate = await db.select({ id: schema.serviceCategories.id })
    .from(schema.serviceCategories)
    .where(and(
      eq(schema.serviceCategories.name, body.name.trim()),
      ne(schema.serviceCategories.id, categoryId)
    ))
    .get()

  if (duplicate) {
    throw createError({
      statusCode: 409,
      message: 'A category with this name already exists'
    })
  }

  await db.update(schema.serviceCategories)
    .set({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      displayOrder: body.displayOrder ?? undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
      updatedAt: new Date()
    })
    .where(eq(schema.serviceCategories.id, categoryId))

  return { success: true }
})
