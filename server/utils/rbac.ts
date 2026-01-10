/**
 * Role-Based Access Control utilities
 * Use these in API endpoints after auth middleware has run
 */

import type { H3Event } from 'h3'

export interface AuthenticatedUser {
  id: string
  email: string
  role: 'ADMIN' | 'LAWYER' | 'STAFF' | 'CLIENT' | 'ADVISOR' | 'LEAD' | 'PROSPECT'
  adminLevel: number // 0=none, 1=basic admin, 2=full admin, 3+=super admin
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
 * Users with adminLevel > 0 are granted access if 'ADMIN' is in allowedRoles
 */
export function requireRole(event: H3Event, allowedRoles: string[]) {
  const user = getAuthUser(event)

  // If ADMIN is allowed and user has any admin level, grant access
  if (allowedRoles.includes('ADMIN') && user.adminLevel > 0) {
    return user
  }

  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions'
    })
  }

  return user
}

/**
 * Check if user has admin privileges (any level)
 */
export function isAdmin(event: H3Event): boolean {
  const user = getAuthUser(event)
  return user.adminLevel > 0 || user.role === 'ADMIN'
}

/**
 * Check if user has at least the specified admin level
 */
export function hasAdminLevel(event: H3Event, requiredLevel: number): boolean {
  const user = getAuthUser(event)
  return user.adminLevel >= requiredLevel
}

/**
 * Require at least the specified admin level
 * Throws 403 if user doesn't have sufficient admin level
 */
export function requireAdminLevel(event: H3Event, requiredLevel: number) {
  const user = getAuthUser(event)

  if (user.adminLevel < requiredLevel) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient admin privileges'
    })
  }

  return user
}

/**
 * Check if user is a firm member (lawyer, staff, or admin)
 */
export function isFirmMember(event: H3Event): boolean {
  const user = getAuthUser(event)
  return user.role === 'LAWYER' || user.role === 'STAFF' || user.role === 'ADMIN' || user.adminLevel > 0
}

/**
 * Check if user is lawyer or admin
 * @deprecated Use isFirmMember() instead for broader firm access checks
 */
export function isLawyerOrAdmin(event: H3Event): boolean {
  const user = getAuthUser(event)
  return user.role === 'LAWYER' || user.role === 'STAFF' || user.role === 'ADMIN' || user.adminLevel > 0
}

/**
 * Check if user is the specified client or a firm member (lawyer/staff/admin)
 */
export function canAccessClient(event: H3Event, clientId: string): boolean {
  const user = getAuthUser(event)

  // Firm members have access to all clients
  if (user.role === 'LAWYER' || user.role === 'STAFF' || user.role === 'ADMIN' || user.adminLevel > 0) {
    return true
  }

  // Clients can only access their own records
  if (user.role === 'CLIENT' && user.id === clientId) {
    return true
  }

  // ADVISOR role requires explicit matter/client assignment (not implemented here)
  // They should NOT have blanket access to all clients

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
