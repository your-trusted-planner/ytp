import { requireRole } from '../../../utils/rbac'

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
  const { mappings } = body

  if (!mappings || typeof mappings !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Mappings object required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
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

  // Update variable mappings
  await db.update(schema.documentTemplates)
    .set({
      variableMappings: JSON.stringify(mappings),
      updatedAt: new Date()
    })
    .where(eq(schema.documentTemplates.id, templateId))

  return {
    success: true,
    templateId,
    mappings
  }
})
