// Get a specific client by ID
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can view client details
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
