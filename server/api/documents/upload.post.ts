import { nanoid } from 'nanoid'
import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  // Read multipart form data
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({
      statusCode: 400,
      message: 'No form data provided'
    })
  }

  // Find the document file in the form data
  const file = form.find(f => f.name === 'document')
  if (!file || !file.data) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded'
    })
  }

  // Validate file type (must be DOCX)
  if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      !file.filename?.endsWith('.docx')) {
    throw createError({
      statusCode: 400,
      message: 'File must be a DOCX document'
    })
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.data.byteLength > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File size must be less than 10MB'
    })
  }

  try {
    const documentId = nanoid()
    const { useDrizzle, schema } = await import('../../db')
    const db = useDrizzle()
    const now = new Date()

    // Upload original DOCX to R2
    const blobPath = `documents/${user.id}/${documentId}.docx`
    await blob.put(blobPath, file.data)

    // Create pending document record in database
    await db.insert(schema.uploadedDocuments).values({
      id: documentId,
      userId: user.id,
      filename: file.filename || 'document.docx',
      blobPath: blobPath,
      status: 'processing',
      fileSize: file.data.byteLength,
      mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      createdAt: now,
      updatedAt: now
    })

    // Send message to processing queue
    // @ts-expect-error - DOCUMENT_QUEUE is bound in wrangler.jsonc
    await event.context.cloudflare.env.DOCUMENT_QUEUE.send({
      documentId,
      userId: user.id,
      blobPath
    })

    return {
      success: true,
      documentId,
      status: 'processing',
      message: 'Document uploaded successfully and queued for processing'
    }
  } catch (error) {
    console.error('Document upload error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to upload document'
    })
  }
})
