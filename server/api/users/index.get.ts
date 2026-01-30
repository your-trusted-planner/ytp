// Get all users (admin level 2+ or ADMIN/LAWYER role for backwards compatibility)
export default defineEventHandler(async (event) => {
  const currentUser = getAuthUser(event)
  const isAuthorized = currentUser.adminLevel >= 2 || ['ADMIN', 'LAWYER'].includes(currentUser.role)
  if (!isAuthorized) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to view users'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  console.log('[Users API] Fetching users from database...')

  const users = await db
    .select()
    .from(schema.users)
    .all()

  console.log(`[Users API] Found ${users.length} users`)

  // Convert to snake_case and sanitize (don't send password hashes)
  const sanitizedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    admin_level: user.adminLevel ?? 0,
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    status: user.status,
    default_hourly_rate: user.defaultHourlyRate ?? null,
    created_at: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    updated_at: user.updatedAt instanceof Date ? user.updatedAt.getTime() : user.updatedAt
  }))

  console.log(`[Users API] Returning ${sanitizedUsers.length} sanitized users`)

  return { users: sanitizedUsers }
})
