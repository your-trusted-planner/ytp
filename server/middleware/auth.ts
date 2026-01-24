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
    path.startsWith('/api/signature/') || // E-signature public endpoints (token-based auth)
    path.startsWith('/api/_') || // Dev/internal routes
    path.startsWith('/_') ||
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/session' || // Allow checking session status
    path === '/api/auth/firebase' || // Firebase OAuth authentication
    path === '/api/auth/forgot-password' || // Password reset flow
    path === '/api/auth/reset-password' || // Password reset flow
    path.startsWith('/api/auth/verify-reset-token') || // Password reset flow (has query params)
    path === '/api/oauth-providers/enabled' || // Public list of enabled OAuth providers
    path === '/api/seed-remote' // Remote seeding (token-based auth)
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
    // Include personId for Belly Button Principle support
    const user = {
      id: dbUser.id,
      personId: dbUser.personId || null, // Link to person identity
      email: dbUser.email,
      role: dbUser.role,
      adminLevel: dbUser.adminLevel ?? 0,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName
    }

    // Attach user to event context for use in route handlers
    event.context.user = user
    event.context.userId = user.id
    event.context.personId = user.personId // Also expose personId directly
    event.context.userRole = user.role
    event.context.adminLevel = user.adminLevel

    // Require admin level 2+ for /api/admin/* routes
    if (path.startsWith('/api/admin/') && user.adminLevel < 2) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient admin privileges'
      })
    }
  } catch (error: any) {
    // Re-throw if already an H3 error (like our 403 above)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
})
