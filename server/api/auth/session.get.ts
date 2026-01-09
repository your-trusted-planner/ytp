export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  // No session exists
  if (!session?.user) {
    console.log('[Session] No session found')
    return { user: null }
  }

  console.log('[Session] Session found for user:', session.user.id, session.user.email)

  // Validate user still exists in database and is active
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const dbUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .get()

  console.log('[Session] DB lookup result:', dbUser ? `found (status: ${dbUser.status})` : 'NOT FOUND')

  // User no longer exists or is inactive - clear session
  if (!dbUser || dbUser.status === 'INACTIVE') {
    console.log('[Session] Clearing session - user not found or inactive')
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
      status: dbUser.status,
      hasPassword: !!dbUser.password,
      hasFirebaseAuth: !!dbUser.firebaseUid
    }
  }
})

