// Get document uploads for an action item
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  getAuthUser(event)

  const actionItemId = getRouterParam(event, 'id')

  if (!actionItemId) {
    throw createError({
      statusCode: 400,
      message: 'Action item ID is required'
    })
  }

  const db = useDrizzle()

  const uploads = await db.select()
    .from(schema.documentUploads)
    .where(eq(schema.documentUploads.actionItemId, actionItemId))
    .all()

  return {
    uploads: uploads.map(u => ({
      id: u.id,
      action_item_id: u.actionItemId,
      document_category: u.documentCategory,
      file_name: u.fileName,
      original_file_name: u.originalFileName,
      file_size: u.fileSize,
      mime_type: u.mimeType,
      status: u.status,
      google_drive_file_id: u.googleDriveFileId,
      google_drive_file_url: u.googleDriveFileUrl,
      google_drive_sync_status: u.googleDriveSyncStatus,
      created_at: u.createdAt
    }))
  }
})
