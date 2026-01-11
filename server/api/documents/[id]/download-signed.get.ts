/**
 * GET /api/documents/[id]/download-signed
 *
 * Download the signed PDF for a document.
 * Only available for documents that have been signed.
 */

import { blob } from 'hub:blob'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get the document
  const document = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Authorization: lawyers/admins/staff can download any document, clients only their own
  if (user.role === 'CLIENT' && document.clientId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Check document is signed
  if (document.status !== 'SIGNED' && document.status !== 'COMPLETED') {
    throw createError({
      statusCode: 400,
      message: 'Document has not been signed yet'
    })
  }

  // Check if signed PDF exists
  if (!document.signedPdfBlobKey) {
    throw createError({
      statusCode: 404,
      message: 'Signed PDF not available for this document'
    })
  }

  // Get PDF from blob storage
  const pdfData = await blob.get(document.signedPdfBlobKey)

  if (!pdfData) {
    throw createError({
      statusCode: 404,
      message: 'Signed PDF file not found in storage'
    })
  }

  // Get the file data as a buffer
  const fileData = await pdfData.arrayBuffer()

  // Encode filename
  const filename = `${document.title} - Signed.pdf`.replace(/[^a-zA-Z0-9.-\s]/g, '_')

  // Set headers for file download
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': fileData.byteLength.toString()
  })

  return Buffer.from(fileData)
})
