// Get all notes for a client
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can view client notes
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

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

