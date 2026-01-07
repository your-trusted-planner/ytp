// Get all users (admin only)
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  const users = await db
    .select()
    .from(schema.users)
    .all()

  // Don't send password hashes to the client
  const sanitizedUsers = users.map(user => {
    const { password, ...rest } = user
    return rest
  })

  return { users: sanitizedUsers }
})
