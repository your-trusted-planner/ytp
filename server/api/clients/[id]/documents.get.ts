// Get all documents for a client
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get all documents for this client
  const documents = await db.prepare(`
    SELECT * FROM documents
    WHERE client_id = ?
    ORDER BY created_at DESC
  `).bind(clientId).all()

  return {
    documents: documents.results || []
  }
})



