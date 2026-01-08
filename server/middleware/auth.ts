/**
 * Authentication middleware for all API routes
 * Checks user session and attaches user to event context
 *
 * Public routes that don't require auth should be in /api/public/
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Skip auth for public routes
  if (
    path.startsWith('/api/public/') ||
    path.startsWith('/api/_') || // Dev/internal routes
    path.startsWith('/_') ||
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/session' // Allow checking session status
  ) {
    return
  }

  // Skip auth for non-API routes (static assets, etc.)
  if (!path.startsWith('/api/')) {
    return
  }

  // Require authenticated session for all other API routes
  try {
    const { user: sessionUser } = await requireUserSession(event)

    // Validate user still exists in database and is active
    const { useDrizzle, schema } = await import('../db')
    const { eq } = await import('drizzle-orm')
    const db = useDrizzle()

    const dbUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, sessionUser.id))
      .get()

    if (!dbUser) {
      // User no longer exists in database - clear session
      await clearUserSession(event)
      throw createError({
        statusCode: 401,
        message: 'User account no longer exists',
        data: { reason: 'deleted' }
      })
    }

    if (dbUser.status === 'INACTIVE') {
      // User account is disabled - clear session
      await clearUserSession(event)
      throw createError({
        statusCode: 403,
        message: 'User account is disabled',
        data: { reason: 'disabled' }
      })
    }

    // Update session user with current data from database
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName
    }

    // Attach user to event context for use in route handlers
    event.context.user = user
    event.context.userId = user.id
    event.context.userRole = user.role
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
})
