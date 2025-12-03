// Upload a document
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Get form data
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  const db = hubDatabase()
  const blob = hubBlob()
  
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
  const upload = {
    id: nanoid(),
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
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO document_uploads (
      id, client_journey_id, action_item_id, uploaded_by_user_id, document_category,
      file_name, original_file_name, file_path, file_size, mime_type, status,
      reviewed_by_user_id, reviewed_at, review_notes, version, replaces_upload_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    upload.id,
    upload.client_journey_id,
    upload.action_item_id,
    upload.uploaded_by_user_id,
    upload.document_category,
    upload.file_name,
    upload.original_file_name,
    upload.file_path,
    upload.file_size,
    upload.mime_type,
    upload.status,
    upload.reviewed_by_user_id,
    upload.reviewed_at,
    upload.review_notes,
    upload.version,
    upload.replaces_upload_id,
    upload.created_at,
    upload.updated_at
  ).run()

  return { upload }
})

