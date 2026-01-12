// Delete a document
import { logActivity } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  // Import blob dynamically to avoid Workers hanging issue
  const { blob } = await import('hub:blob')

  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get document
  const document = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Authorization check
  const canDelete = checkDeleteAuthorization(user, document)
  if (!canDelete) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to delete this document'
    })
  }

  // Confirmation check for non-DRAFT documents
  const body = await readBody(event).catch(() => ({}))
  const requiresConfirmation = document.status !== 'DRAFT'

  if (requiresConfirmation && !body.confirmDelete) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Confirmation required',
        message: `This document has status ${document.status}. Set confirmDelete: true to proceed.`,
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
          signedAt: document.signedAt
        }
      }
    })
  }

  // Track what we're deleting for the response
  const deletionDetails = {
    document: {
      id: document.id,
      title: document.title,
      status: document.status
    },
    signatureSessions: 0,
    blobsDeleted: [] as string[]
  }

  // Count signature sessions (will be cascade deleted)
  const sessionCount = await db.select({
    count: sql<number>`count(*)`
  })
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.documentId, id))
    .get()

  deletionDetails.signatureSessions = sessionCount?.count || 0

  // Clean up blob storage
  try {
    if (document.docxBlobKey) {
      await blob.delete(document.docxBlobKey)
      deletionDetails.blobsDeleted.push('docx')
    }
  } catch (error) {
    console.warn('Failed to delete docx blob:', error)
    // Continue with deletion even if blob cleanup fails
  }

  try {
    if (document.signedPdfBlobKey) {
      await blob.delete(document.signedPdfBlobKey)
      deletionDetails.blobsDeleted.push('signedPdf')
    }
  } catch (error) {
    console.warn('Failed to delete signedPdf blob:', error)
  }

  // Log activity before deletion
  const actorName = user.firstName || user.email
  await logActivity({
    type: 'DOCUMENT_DELETED',
    description: `${actorName} deleted document "${document.title}" (status: ${document.status})`,
    userId: user.id,
    userRole: user.role,
    targetType: 'document',
    targetId: id,
    matterId: document.matterId || undefined,
    event,
    metadata: {
      documentTitle: document.title,
      documentStatus: document.status,
      templateId: document.templateId,
      clientId: document.clientId,
      hadSignature: !!document.signatureData,
      deletedByAdminLevel: user.adminLevel,
      confirmationRequired: requiresConfirmation,
      signatureSessionsDeleted: deletionDetails.signatureSessions,
      blobsDeleted: deletionDetails.blobsDeleted
    }
  })

  // Delete document (signature sessions cascade automatically)
  await db.delete(schema.documents)
    .where(eq(schema.documents.id, id))

  return {
    success: true,
    message: 'Document deleted successfully',
    deleted: deletionDetails
  }
})

/**
 * Check if user is authorized to delete this document
 */
function checkDeleteAuthorization(user: any, document: any): boolean {
  // Admin level 2+ can delete anything
  if (user.adminLevel >= 2 || user.role === 'ADMIN') {
    return true
  }

  // For SIGNED/COMPLETED documents, only admin level 2+ can delete
  if (document.status === 'SIGNED' || document.status === 'COMPLETED') {
    return false
  }

  // Staff can delete DRAFT documents
  if (user.role === 'STAFF' && document.status === 'DRAFT') {
    return true
  }

  // Lawyers can delete DRAFT documents
  if (user.role === 'LAWYER' && document.status === 'DRAFT') {
    return true
  }

  // Creator (client) can delete their own DRAFT documents
  if (user.role === 'CLIENT' && document.clientId === user.id && document.status === 'DRAFT') {
    return true
  }

  return false
}
