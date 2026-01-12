// Delete a template (soft or hard delete)
import { logActivity } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  console.log('[Template Delete] Handler started')

  console.log('[Template Delete] Getting router param')
  const id = getRouterParam(event, 'id')
  console.log('[Template Delete] Router param:', id)

  console.log('[Template Delete] Calling requireUserSession')
  const { user } = await requireUserSession(event)
  console.log('[Template Delete] User session retrieved:', user?.id)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Template ID is required'
    })
  }

  // Only admins can delete templates
  if (user.role !== 'ADMIN' && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'Only admins can delete templates'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, sql } = await import('drizzle-orm')
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

  // Count documents referencing this template
  const documentCount = await db.select({
    count: sql<number>`count(*)`
  })
    .from(schema.documents)
    .where(eq(schema.documents.templateId, id))
    .get()

  const referencingDocuments = documentCount?.count || 0
  const body = await readBody(event).catch(() => ({}))

  let deletionMethod: 'soft' | 'hard'
  let blobsDeleted: string[] = []

  if (referencingDocuments > 0) {
    // Template is referenced - must soft delete
    if (body.forceHardDelete) {
      throw createError({
        statusCode: 400,
        message: `Cannot hard delete: template is referenced by ${referencingDocuments} document(s)`,
        data: {
          referencingDocuments
        }
      })
    }

    // Soft delete: set isActive = false
    await db.update(schema.documentTemplates)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(schema.documentTemplates.id, id))

    deletionMethod = 'soft'
  } else {
    // Template not referenced - can hard delete if requested
    if (body.forceHardDelete) {
      // Clean up blob storage before hard delete
      try {
        if (template.docxBlobKey) {
          const { blob } = await import('hub:blob')
          await blob.delete(template.docxBlobKey)
          blobsDeleted.push('docx')
        }
      } catch (error) {
        console.warn('Failed to delete template blob:', error)
      }

      // Hard delete from database
      await db.delete(schema.documentTemplates)
        .where(eq(schema.documentTemplates.id, id))

      deletionMethod = 'hard'
    } else {
      // Default to soft delete even when not referenced (safer)
      await db.update(schema.documentTemplates)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(schema.documentTemplates.id, id))

      deletionMethod = 'soft'
    }
  }

  // Log activity
  const actorName = user.firstName || user.email
  await logActivity({
    type: 'TEMPLATE_DELETED',
    description: `${actorName} ${deletionMethod === 'soft' ? 'soft deleted' : 'permanently deleted'} template "${template.name}"`,
    userId: user.id,
    userRole: user.role,
    targetType: 'template',
    targetId: id,
    event,
    metadata: {
      templateName: template.name,
      templateCategory: template.category,
      deletionMethod,
      referencingDocuments,
      blobsDeleted: deletionMethod === 'hard' ? blobsDeleted : [],
      wasActive: template.isActive
    }
  })

  // Return appropriate response
  if (deletionMethod === 'soft') {
    return {
      success: true,
      message: referencingDocuments > 0
        ? 'Template soft deleted (isActive=false)'
        : 'Template soft deleted (can be reactivated)',
      deleted: {
        template: {
          id: template.id,
          name: template.name
        },
        method: 'soft',
        referencingDocuments,
        canReactivate: true
      }
    }
  } else {
    return {
      success: true,
      message: 'Template permanently deleted',
      deleted: {
        template: {
          id: template.id,
          name: template.name
        },
        method: 'hard',
        blobsDeleted
      }
    }
  }
})
