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

  // Helper to attach user context from a DB user record
  const attachUserContext = (dbUser: any) => {
    const user = {
      id: dbUser.id,
      personId: dbUser.personId || null,
      email: dbUser.email,
      role: dbUser.role,
      adminLevel: dbUser.adminLevel ?? 0,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName
    }
    event.context.user = user
    event.context.userId = user.id
    event.context.personId = user.personId
    event.context.userRole = user.role
    event.context.adminLevel = user.adminLevel

    // Require admin level 2+ for /api/admin/* routes
    if (path.startsWith('/api/admin/') && user.adminLevel < 2) {
      throw createError({
        statusCode: 403,
        message: 'Insufficient admin privileges'
      })
    }
  }

  // Check for API token auth (Bearer header) before session auth
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ytp_')) {
    const token = authHeader.slice(7) // Remove "Bearer " prefix
    const { sha256 } = await import('../utils/auth')
    const { useDrizzle, schema } = await import('../db')
    const { eq } = await import('drizzle-orm')
    const db = useDrizzle()

    const hash = await sha256(token)
    const dbUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.apiTokenHash, hash))
      .get()

    if (!dbUser || dbUser.status === 'INACTIVE') {
      throw createError({
        statusCode: 401,
        message: 'Invalid API token'
      })
    }

    attachUserContext(dbUser)
    return
  }

  // Fall through to session-based auth
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
      await clearUserSession(event)
      throw createError({
        statusCode: 401,
        message: 'User account no longer exists',
        data: { reason: 'deleted' }
      })
    }

    if (dbUser.status === 'INACTIVE') {
      await clearUserSession(event)
      throw createError({
        statusCode: 403,
        message: 'User account is disabled',
        data: { reason: 'disabled' }
      })
    }

    attachUserContext(dbUser)
  }
  catch (error: any) {
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
