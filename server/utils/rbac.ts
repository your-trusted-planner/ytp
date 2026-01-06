/**
 * Role-Based Access Control utilities
 * Use these in API endpoints after auth middleware has run
 */

import type { H3Event } from 'h3'

export interface AuthenticatedUser {
  id: string
  email: string
  role: 'ADMIN' | 'LAWYER' | 'CLIENT' | 'LEAD' | 'PROSPECT'
  firstName?: string
  lastName?: string
}

/**
 * Get the authenticated user from the event context
 * (Already validated by auth middleware)
 */
export function getAuthUser(event: H3Event): AuthenticatedUser {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
  return event.context.user
}

/**
 * Require specific role(s) for the endpoint
 * Throws 403 if user doesn't have required role
 */
export function requireRole(event: H3Event, allowedRoles: string[]) {
  const user = getAuthUser(event)

  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions'
    })
  }

  return user
}

/**
 * Check if user is admin
 */
export function isAdmin(event: H3Event): boolean {
  const user = getAuthUser(event)
  return user.role === 'ADMIN'
}

/**
 * Check if user is lawyer or admin
 */
export function isLawyerOrAdmin(event: H3Event): boolean {
  const user = getAuthUser(event)
  return user.role === 'LAWYER' || user.role === 'ADMIN'
}

/**
 * Check if user is the specified client or a lawyer/admin
 */
export function canAccessClient(event: H3Event, clientId: string): boolean {
  const user = getAuthUser(event)

  if (user.role === 'LAWYER' || user.role === 'ADMIN') {
    return true
  }

  if (user.role === 'CLIENT' && user.id === clientId) {
    return true
  }

  return false
}

/**
 * Require user to be the specified client or a lawyer/admin
 */
export function requireClientAccess(event: H3Event, clientId: string) {
  if (!canAccessClient(event, clientId)) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    })
  }

  return getAuthUser(event)
}
