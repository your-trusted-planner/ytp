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
    path === '/api/oauth-providers/enabled' || // Public list of enabled OAuth providers
    path === '/api/seed-remote' // Remote seeding (token-based auth)
  ) {
    return
  }

  // Skip auth for non-API routes (static assets, etc.)
  if (!path.startsWith('/api/')) {
    return
  }

  // Check for API token authentication first (Bearer token)
  const authHeader = getHeader(event, 'authorization')
  let dbUser = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // API Token authentication
    const token = authHeader.substring(7) // Remove "Bearer " prefix

    const { useDrizzle, schema } = await import('../db')
    const { eq } = await import('drizzle-orm')
    const { verifyPassword } = await import('../utils/auth')
    const db = useDrizzle()

    // Find all tokens and check each one (can't query by hash directly)
    const allTokens = await db.select()
      .from(schema.apiTokens)
      .all()

    let validToken = null
    for (const tokenRecord of allTokens) {
      const isValid = await verifyPassword(token, tokenRecord.tokenHash)
      if (isValid) {
        validToken = tokenRecord
        break
      }
    }

    if (!validToken) {
      throw createError({
        statusCode: 401,
        message: 'Invalid API token'
      })
    }

    // Check if token is expired
    if (validToken.expiresAt && new Date(validToken.expiresAt * 1000) < new Date()) {
      throw createError({
        statusCode: 401,
        message: 'API token has expired'
      })
    }

    // Get the user associated with this token
    dbUser = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, validToken.userId))
      .get()

    if (!dbUser) {
      throw createError({
        statusCode: 401,
        message: 'User account no longer exists'
      })
    }

    // Update last used timestamp
    await db.update(schema.apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiTokens.id, validToken.id))
  } else {
    // Session-based authentication (existing behavior)
    try {
      const { user: sessionUser } = await requireUserSession(event)

      // Validate user still exists in database and is active
      const { useDrizzle, schema } = await import('../db')
      const { eq } = await import('drizzle-orm')
      const db = useDrizzle()

      dbUser = await db
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
    } catch (error) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }
  }

  // Common validation for both auth methods
  if (dbUser.status === 'INACTIVE') {
    throw createError({
      statusCode: 403,
      message: 'User account is disabled',
      data: { reason: 'disabled' }
    })
  }

  // Attach user to event context for use in route handlers
  const user = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    adminLevel: dbUser.adminLevel ?? 0,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName
  }

  event.context.user = user
  event.context.userId = user.id
  event.context.userRole = user.role
  event.context.adminLevel = user.adminLevel
})
