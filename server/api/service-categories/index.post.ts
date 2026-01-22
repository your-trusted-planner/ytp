// Create a new service category
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Category name is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Check for duplicate name
  const existing = await db.select({ id: schema.serviceCategories.id })
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.name, body.name.trim()))
    .get()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'A category with this name already exists'
    })
  }

  // Get next display order
  const maxOrder = await db.select({ max: sql<number>`MAX(display_order)` })
    .from(schema.serviceCategories)
    .get()

  const categoryId = nanoid()
  const now = new Date()

  await db.insert(schema.serviceCategories).values({
    id: categoryId,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    displayOrder: (maxOrder?.max || 0) + 1,
    isActive: true,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    category: {
      id: categoryId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      display_order: (maxOrder?.max || 0) + 1,
      is_active: 1
    }
  }
})
