import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const templateId = getRouterParam(event, 'id')
  if (!templateId) {
    throw createError({
      statusCode: 400,
      message: 'Template ID required'
    })
  }

  const body = await readBody(event)
  const { name, description, category, isActive } = body

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'Template name is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify template exists
  const template = await db.select({ id: schema.documentTemplates.id })
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, templateId))
    .get()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  // Update template
  await db.update(schema.documentTemplates)
    .set({
      name,
      description: description || '',
      category: category || 'General',
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    })
    .where(eq(schema.documentTemplates.id, templateId))

  return {
    success: true,
    template: {
      id: templateId,
      name,
      description,
      category,
      isActive
    }
  }
})
