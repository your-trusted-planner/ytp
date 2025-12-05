export default defineEventHandler(async (event) => {
  // Require authenticated user
  const session = await requireUserSession(event)

  // Get document ID from route params
  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  try {
    const db = hubDatabase()

    // Fetch document status
    const doc = await db.prepare(`
      SELECT
        id,
        filename,
        status,
        content_text,
        content_html,
        paragraph_count,
        error_message,
        file_size,
        created_at,
        processed_at
      FROM uploaded_documents
      WHERE id = ? AND user_id = ?
    `).bind(documentId, session.user.id).first()

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
      contentText: doc.content_text,
      contentHtml: doc.content_html,
      paragraphCount: doc.paragraph_count,
      errorMessage: doc.error_message,
      fileSize: doc.file_size,
      createdAt: doc.created_at,
      processedAt: doc.processed_at
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
