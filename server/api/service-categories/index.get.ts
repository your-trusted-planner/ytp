// Get all service categories
export default defineEventHandler(async (event) => {
  // Allow any authenticated user to read categories (needed for forms)
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, asc } = await import('drizzle-orm')
  const db = useDrizzle()

  const categories = await db.select()
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.isActive, true))
    .orderBy(asc(schema.serviceCategories.displayOrder), asc(schema.serviceCategories.name))
    .all()

  // Convert to snake_case for API compatibility
  return {
    categories: categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      display_order: cat.displayOrder,
      is_active: cat.isActive ? 1 : 0,
      created_at: cat.createdAt instanceof Date ? cat.createdAt.getTime() : cat.createdAt,
      updated_at: cat.updatedAt instanceof Date ? cat.updatedAt.getTime() : cat.updatedAt
    }))
  }
})
