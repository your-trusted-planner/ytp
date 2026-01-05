// Get a single matter by ID
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const db = hubDatabase()

  // Get the matter
  const matter = await db.prepare(`
    SELECT
      m.*,
      u.first_name as client_first_name,
      u.last_name as client_last_name,
      u.email as client_email
    FROM matters m
    LEFT JOIN users u ON m.client_id = u.id
    WHERE m.id = ?
  `).bind(matterId).first()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Authorization: lawyers/admins can view any matter, clients can only view their own
  if (user.role === 'CLIENT' && matter.client_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  return {
    matter
  }
})
