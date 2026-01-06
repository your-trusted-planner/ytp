// Get a specific client by ID
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
  
  // Get client
  const client = await db.prepare(`
    SELECT * FROM users WHERE id = ? AND role = 'CLIENT'
  `).bind(clientId).first()

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get client profile
  const profile = await db.prepare(`
    SELECT * FROM client_profiles WHERE user_id = ?
  `).bind(clientId).first()

  return {
    client,
    profile: profile || null
  }
})
