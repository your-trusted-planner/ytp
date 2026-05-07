// Serve the unsigned PDF for preview/field placement,
// or the signed PDF if the document is completed.
import { blob } from 'hub:blob'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  // Only staff can preview documents
  if (!['ADMIN', 'LAWYER', 'STAFF']
    .includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized',
    })
  }

  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required',
    })
  }

  const { useDrizzle, schema } = await import(
    '../../../db'
  )
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const document = await db.select({
    unsignedPdfBlobKey:
      schema.documents.unsignedPdfBlobKey,
    signedPdfBlobKey:
      schema.documents.signedPdfBlobKey,
    status: schema.documents.status,
  })
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found',
    })
  }

  // Prefer signed PDF for completed docs,
  // otherwise serve unsigned
  const blobKey
    = document.status === 'COMPLETED'
      && document.signedPdfBlobKey
      ? document.signedPdfBlobKey
      : document.unsignedPdfBlobKey

  if (!blobKey) {
    throw createError({
      statusCode: 404,
      message: 'No PDF available for this document',
    })
  }

  return blob.serve(event, blobKey)
})
