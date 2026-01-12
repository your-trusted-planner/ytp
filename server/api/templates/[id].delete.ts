// Delete a template (soft or hard delete)
// INCREMENTAL DEBUG v5: Add activity logging
import { logActivity } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Template ID required' })
  }

  // Only admins can delete templates
  if (user.role !== 'ADMIN' && user.adminLevel < 2) {
    throw createError({ statusCode: 403, message: 'Only admins can delete templates' })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const template = await db.select()
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, id))
    .get()

  if (!template) {
    throw createError({ statusCode: 404, message: 'Template not found' })
  }

  // Soft delete: set isActive = false
  await db.update(schema.documentTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.documentTemplates.id, id))

  // Log activity
  const actorName = user.firstName || user.email
  await logActivity({
    type: 'TEMPLATE_DELETED',
    description: `${actorName} soft deleted template "${template.name}"`,
    userId: user.id,
    userRole: user.role,
    targetType: 'template',
    targetId: id,
    event,
    metadata: {
      templateName: template.name,
      deletionMethod: 'soft'
    }
  })

  return {
    success: true,
    debug: 'v5-with-logging',
    message: 'Template soft deleted',
    deleted: {
      template: { id: template.id, name: template.name },
      method: 'soft'
    }
  }
})
