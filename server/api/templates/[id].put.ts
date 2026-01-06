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

  const db = hubDatabase()

  // Verify template exists
  const template = await db.prepare(`
    SELECT id FROM document_templates WHERE id = ?
  `).bind(templateId).first()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  // Update template
  await db.prepare(`
    UPDATE document_templates
    SET name = ?,
        description = ?,
        category = ?,
        is_active = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    name,
    description || '',
    category || 'General',
    isActive !== undefined ? (isActive ? 1 : 0) : 1,
    Date.now(),
    templateId
  ).run()

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
