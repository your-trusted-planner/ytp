// Download a document upload
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const uploadId = getRouterParam(event, 'id')
  
  if (!uploadId) {
    throw createError({
      statusCode: 400,
      message: 'Upload ID is required'
    })
  }

  const db = hubDatabase()
  const blob = hubBlob()
  
  // Get upload record
  const upload = await db.prepare(`
    SELECT du.*, cj.client_id
    FROM document_uploads du
    LEFT JOIN client_journeys cj ON du.client_journey_id = cj.id
    WHERE du.id = ?
  `).bind(uploadId).first()

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: 'Upload not found'
    })
  }

  // Check authorization
  const canAccess = 
    user.role === 'LAWYER' || 
    user.role === 'ADMIN' ||
    user.id === upload.uploaded_by_user_id ||
    user.id === upload.client_id

  if (!canAccess) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Get file from blob storage
  const file = await blob.get(upload.file_path)
  
  if (!file) {
    throw createError({
      statusCode: 404,
      message: 'File not found in storage'
    })
  }

  // Set headers for download
  setResponseHeaders(event, {
    'Content-Type': upload.mime_type,
    'Content-Disposition': `attachment; filename="${upload.original_file_name}"`,
    'Content-Length': upload.file_size.toString()
  })

  return file
})

