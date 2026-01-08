// Get all users (admin/lawyer only)
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

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
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    status: user.status,
    created_at: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
    updated_at: user.updatedAt instanceof Date ? user.updatedAt.getTime() : user.updatedAt
  }))

  console.log(`[Users API] Returning ${sanitizedUsers.length} sanitized users`)

  return { users: sanitizedUsers }
})
