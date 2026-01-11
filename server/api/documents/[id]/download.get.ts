// Download a document as DOCX file
import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  console.log('[Download] Request received for document:', documentId, 'by user:', user.email)

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get the document
  const document = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  console.log('[Download] Document found:', document?.id, 'blob key:', document?.docxBlobKey)

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Authorization: lawyers/admins can download any document, clients only their own
  if (user.role === 'CLIENT' && document.clientId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Prevent downloading editable DOCX for signed documents
  if (document.status === 'SIGNED' || document.status === 'COMPLETED') {
    throw createError({
      statusCode: 403,
      message: 'Cannot download editable version of a signed document'
    })
  }

  // Check if document has a DOCX file
  if (!document.docxBlobKey) {
    console.error('[Download] Document has no DOCX blob key')
    throw createError({
      statusCode: 404,
      message: 'Document DOCX file not found. This document may have been created before DOCX generation was enabled.'
    })
  }

  // Get DOCX file from blob storage
  console.log('[Download] Fetching blob from storage:', document.docxBlobKey)
  const blobData = await blob.get(document.docxBlobKey)

  if (!blobData) {
    console.error('[Download] Blob not found in storage:', document.docxBlobKey)
    throw createError({
      statusCode: 404,
      message: 'Document file not found in storage'
    })
  }

  // Get the file data as a buffer
  const fileData = await blobData.arrayBuffer()
  console.log('[Download] File data size:', fileData.byteLength, 'bytes')

  // Encode filename to handle special characters
  const filename = `${document.title}.docx`.replace(/[^a-zA-Z0-9.-]/g, '_')

  // Set headers for file download
  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': fileData.byteLength.toString()
  })

  console.log('[Download] Sending file data')

  // Return as Buffer for proper binary handling
  return Buffer.from(fileData)
})
