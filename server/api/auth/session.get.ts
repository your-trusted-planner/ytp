export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  // No session exists
  if (!session?.user) {
    return { user: null }
  }

  // Validate user still exists in database and is active
  const { useDrizzle, schema } = await import('../../database')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const dbUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .get()

  // User no longer exists or is inactive - clear session
  if (!dbUser || dbUser.status === 'INACTIVE') {
    await clearUserSession(event)
    return { user: null }
  }

  // Return current user data from database
  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      status: dbUser.status
    }
  }
})

