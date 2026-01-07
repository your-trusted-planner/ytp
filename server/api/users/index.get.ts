// Get all users (admin/lawyer only)
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN', 'LAWYER'])

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  console.log('[Users API] Fetching users from database...')

  const users = await db
    .select()
    .from(schema.users)
    .all()

  console.log(`[Users API] Found ${users.length} users`)

  // Don't send password hashes to the client
  const sanitizedUsers = users.map(user => {
    const { password, ...rest } = user
    return rest
  })

  console.log(`[Users API] Returning ${sanitizedUsers.length} sanitized users`)

  return { users: sanitizedUsers }
})
