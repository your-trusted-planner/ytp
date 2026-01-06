import { requireRole } from '../../../utils/auth'

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

  // Update variable mappings
  await db.prepare(`
    UPDATE document_templates
    SET variable_mappings = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    JSON.stringify(mappings),
    Date.now(),
    templateId
  ).run()

  return {
    success: true,
    templateId,
    mappings
  }
})
