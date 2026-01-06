// Get all notes for a client
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
  
  // Get all notes for this client
  const notes = await db.prepare(`
    SELECT * FROM notes
    WHERE client_id = ?
    ORDER BY created_at DESC
  `).bind(clientId).all()

  return {
    notes: notes.results || []
  }
})



