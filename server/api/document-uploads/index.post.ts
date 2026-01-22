// Upload a document
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  // Get form data
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()
  // blob is auto-imported from hub:blob

  // Extract fields from form data
  let clientJourneyId: string | undefined
  let actionItemId: string | undefined
  let documentCategory: string | undefined
  let file: any

  for (const part of form) {
    if (part.name === 'clientJourneyId') {
      clientJourneyId = part.data.toString()
    } else if (part.name === 'actionItemId') {
      actionItemId = part.data.toString()
    } else if (part.name === 'documentCategory') {
      documentCategory = part.data.toString()
    } else if (part.name === 'file') {
      file = part
    }
  }

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  // Generate unique filename
  const fileId = nanoid()
  const fileExt = file.filename?.split('.').pop() || 'bin'
  const uniqueFilename = `${fileId}.${fileExt}`
  const filePath = `uploads/${user.id}/${uniqueFilename}`

  // Upload to R2/Blob storage
  await blob.put(filePath, file.data, {
    contentType: file.type || 'application/octet-stream'
  })

  // Create database record
  const uploadId = nanoid()
  const now = new Date()

  await db.insert(schema.documentUploads).values({
    id: uploadId,
    clientJourneyId: clientJourneyId || null,
    actionItemId: actionItemId || null,
    uploadedByUserId: user.id,
    documentCategory: documentCategory || 'General',
    fileName: uniqueFilename,
    originalFileName: file.filename || 'unknown',
    filePath: filePath,
    fileSize: file.data.length,
    mimeType: file.type || 'application/octet-stream',
    status: 'PENDING_REVIEW',
    reviewedByUserId: null,
    reviewedAt: null,
    reviewNotes: null,
    version: 1,
    replacesUploadId: null,
    createdAt: now,
    updatedAt: now
  })

  // Queue for Google Drive sync if enabled and journey is associated
  if (clientJourneyId) {
    try {
      const { isDriveEnabled, syncUploadToDrive } = await import('../../utils/google-drive')
      const { eq } = await import('drizzle-orm')

      if (await isDriveEnabled()) {
        // Mark upload as pending sync
        await db.update(schema.documentUploads)
          .set({ googleDriveSyncStatus: 'PENDING' })
          .where(eq(schema.documentUploads.id, uploadId))

        // Queue the sync (async, non-blocking)
        syncUploadToDrive(uploadId).catch(error => {
          console.error('Failed to sync upload to Google Drive:', error)
        })
      }
    } catch (error) {
      console.error('Error checking Drive sync status:', error)
    }
  }

  // Return upload object for compatibility
  return {
    upload: {
      id: uploadId,
      client_journey_id: clientJourneyId || null,
      action_item_id: actionItemId || null,
      uploaded_by_user_id: user.id,
      document_category: documentCategory || 'General',
      file_name: uniqueFilename,
      original_file_name: file.filename || 'unknown',
      file_path: filePath,
      file_size: file.data.length,
      mime_type: file.type || 'application/octet-stream',
      status: 'PENDING_REVIEW',
      reviewed_by_user_id: null,
      reviewed_at: null,
      review_notes: null,
      version: 1,
      replaces_upload_id: null,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})



