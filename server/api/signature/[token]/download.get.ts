// Public endpoint to download signed PDF via signature token
// This allows signers to download immediately after signing without auth

import { blob } from 'hub:blob'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get signature session
  const session = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.signingToken, token))
    .get()

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Signature session not found'
    })
  }

  // Only allow download for signed sessions
  if (session.status !== 'SIGNED') {
    throw createError({
      statusCode: 400,
      message: 'Document has not been signed yet'
    })
  }

  // Get document
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, session.documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  if (!document.signedPdfBlobKey) {
    throw createError({
      statusCode: 404,
      message: 'Signed PDF not available. Please contact the sender.'
    })
  }

  // Get PDF from blob storage
  const pdfData = await blob.get(document.signedPdfBlobKey)

  if (!pdfData) {
    throw createError({
      statusCode: 404,
      message: 'Signed PDF file not found'
    })
  }

  // Get the file data as a buffer
  const fileData = await pdfData.arrayBuffer()

  // Encode filename safely
  const filename = `${document.title || 'document'} - Signed.pdf`.replace(/[^a-zA-Z0-9.-\s]/g, '_')

  // Set headers for file download
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': fileData.byteLength.toString()
  })

  return Buffer.from(fileData)
})
