export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  // Get document ID from route params
  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  try {
    const { useDrizzle, schema } = await import('../../../db')
    const { eq, and } = await import('drizzle-orm')
    const db = useDrizzle()

    // Fetch document status
    const doc = await db.select({
      id: schema.uploadedDocuments.id,
      filename: schema.uploadedDocuments.filename,
      status: schema.uploadedDocuments.status,
      contentText: schema.uploadedDocuments.contentText,
      contentHtml: schema.uploadedDocuments.contentHtml,
      paragraphCount: schema.uploadedDocuments.paragraphCount,
      errorMessage: schema.uploadedDocuments.errorMessage,
      fileSize: schema.uploadedDocuments.fileSize,
      createdAt: schema.uploadedDocuments.createdAt,
      processedAt: schema.uploadedDocuments.processedAt
    })
      .from(schema.uploadedDocuments)
      .where(and(
        eq(schema.uploadedDocuments.id, documentId),
        eq(schema.uploadedDocuments.userId, user.id)
      ))
      .get()

    if (!doc) {
      throw createError({
        statusCode: 404,
        message: 'Document not found'
      })
    }

    return {
      id: doc.id,
      filename: doc.filename,
      status: doc.status,
      contentText: doc.contentText,
      contentHtml: doc.contentHtml,
      paragraphCount: doc.paragraphCount,
      errorMessage: doc.errorMessage,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      processedAt: doc.processedAt
    }
  } catch (error) {
    console.error('Error fetching document status:', error)

    // Re-throw if it's already an H3 error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch document status'
    })
  }
})
