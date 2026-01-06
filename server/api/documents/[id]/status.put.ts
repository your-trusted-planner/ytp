// Update document status
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const body = await readBody(event)
  const { status } = body

  if (!status) {
    throw createError({
      statusCode: 400,
      message: 'Status is required'
    })
  }

  // Validate status
  const validStatuses = ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid status'
    })
  }

  const db = hubDatabase()

  // Get the document to check authorization
  const document = await db.prepare(`
    SELECT * FROM documents WHERE id = ?
  `).bind(documentId).first()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Only lawyers/admins can update document status
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Update the status
  await db.prepare(`
    UPDATE documents
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, Date.now(), documentId).run()

  return { success: true, status }
})
