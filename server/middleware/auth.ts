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
    path === '/api/auth/logout'
  ) {
    return
  }

  // Skip auth for non-API routes (static assets, etc.)
  if (!path.startsWith('/api/')) {
    return
  }

  // Require authenticated session for all other API routes
  try {
    const { user } = await requireUserSession(event)

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
