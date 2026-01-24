/**
 * POST /api/google-drive/sync/document/[id]
 * Manually trigger Google Drive sync for a document
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../../../utils/rbac'
import { isDriveEnabled, syncDocumentToDrive } from '../../../../utils/google-drive'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'LAWYER'])

  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  // Check if Drive is enabled
  if (!await isDriveEnabled()) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive integration is not enabled'
    })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const db = useDrizzle()

  // Get document info
  const doc = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!doc) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  if (!doc.matterId) {
    throw createError({
      statusCode: 400,
      message: 'Document is not associated with a matter'
    })
  }

  // Check if already synced
  if (doc.googleDriveFileId && doc.googleDriveSyncStatus === 'SYNCED') {
    return {
      success: true,
      message: 'Document is already synced to Google Drive',
      fileId: doc.googleDriveFileId,
      fileUrl: doc.googleDriveFileUrl,
      alreadySynced: true
    }
  }

  try {
    // Mark as pending
    await db.update(schema.documents)
      .set({ googleDriveSyncStatus: 'PENDING' })
      .where(eq(schema.documents.id, documentId))

    const result = await syncDocumentToDrive(documentId)

    if (result.success) {
      return {
        success: true,
        message: 'Document synced to Google Drive successfully',
        fileId: result.fileId,
        fileUrl: result.fileUrl
      }
    } else {
      throw createError({
        statusCode: 500,
        message: result.error || 'Failed to sync document'
      })
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to sync document: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
