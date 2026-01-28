// Reactivate a soft-deleted template
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Template ID is required'
    })
  }

  // Only admins can reactivate templates
  if (user.role !== 'ADMIN' && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'Only admins can reactivate templates'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get template
  const template = await db.select()
    .from(schema.documentTemplates)
    .where(eq(schema.documentTemplates.id, id))
    .get()

  if (!template) {
    throw createError({
      statusCode: 404,
      message: 'Template not found'
    })
  }

  if (template.isActive) {
    throw createError({
      statusCode: 400,
      message: 'Template is already active'
    })
  }

  // Reactivate template
  await db.update(schema.documentTemplates)
    .set({
      isActive: true,
      updatedAt: new Date()
    })
    .where(eq(schema.documentTemplates.id, id))

  // Log activity
  await logActivity({
    type: 'TEMPLATE_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'template', id: id, name: template.name },
    event,
    details: {
      templateCategory: template.category,
      action: 'reactivate'
    }
  })

  return {
    success: true,
    message: 'Template reactivated',
    template: {
      id: template.id,
      name: template.name,
      isActive: true
    }
  }
})
