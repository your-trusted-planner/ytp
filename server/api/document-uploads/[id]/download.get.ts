// Download a document upload
import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const uploadId = getRouterParam(event, 'id')

  if (!uploadId) {
    throw createError({
      statusCode: 400,
      message: 'Upload ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get upload record
  const upload = await db.select({
    id: schema.documentUploads.id,
    clientJourneyId: schema.documentUploads.clientJourneyId,
    actionItemId: schema.documentUploads.actionItemId,
    uploadedByUserId: schema.documentUploads.uploadedByUserId,
    documentCategory: schema.documentUploads.documentCategory,
    fileName: schema.documentUploads.fileName,
    originalFileName: schema.documentUploads.originalFileName,
    filePath: schema.documentUploads.filePath,
    fileSize: schema.documentUploads.fileSize,
    mimeType: schema.documentUploads.mimeType,
    status: schema.documentUploads.status,
    reviewedByUserId: schema.documentUploads.reviewedByUserId,
    reviewedAt: schema.documentUploads.reviewedAt,
    reviewNotes: schema.documentUploads.reviewNotes,
    version: schema.documentUploads.version,
    replacesUploadId: schema.documentUploads.replacesUploadId,
    createdAt: schema.documentUploads.createdAt,
    updatedAt: schema.documentUploads.updatedAt,
    client_id: schema.clientJourneys.clientId
  })
    .from(schema.documentUploads)
    .leftJoin(schema.clientJourneys, eq(schema.documentUploads.clientJourneyId, schema.clientJourneys.id))
    .where(eq(schema.documentUploads.id, uploadId))
    .get()

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
    user.id === upload.uploadedByUserId ||
    user.id === upload.client_id

  if (!canAccess) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Get file from blob storage
  const file = await blob.get(upload.filePath)

  if (!file) {
    throw createError({
      statusCode: 404,
      message: 'File not found in storage'
    })
  }

  // Set headers for download
  setResponseHeaders(event, {
    'Content-Type': upload.mimeType,
    'Content-Disposition': `attachment; filename="${upload.originalFileName}"`,
    'Content-Length': upload.fileSize.toString()
  })

  return file
})



