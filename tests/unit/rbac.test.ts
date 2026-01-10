/**
 * Tests for server/utils/rbac.ts
 * Covers role-based access control and permission checking
 */

import { describe, it, expect } from 'vitest'
import type { H3Event } from 'h3'
import {
  getAuthUser,
  requireRole,
  isAdmin,
  hasAdminLevel,
  requireAdminLevel,
  isLawyerOrAdmin,
  canAccessClient,
  requireClientAccess,
  type AuthenticatedUser
} from '../../server/utils/rbac'

// Helper to create mock H3 events
function createMockEvent(user?: AuthenticatedUser): H3Event {
  return {
    context: {
      user
    }
  } as unknown as H3Event
}

// Test users
const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'ADMIN',
  adminLevel: 2,
  firstName: 'Admin',
  lastName: 'User'
}

const lawyerUser: AuthenticatedUser = {
  id: 'lawyer-1',
  email: 'lawyer@test.com',
  role: 'LAWYER',
  adminLevel: 0,
  firstName: 'Lawyer',
  lastName: 'User'
}

const clientUser: AuthenticatedUser = {
  id: 'client-1',
  email: 'client@test.com',
  role: 'CLIENT',
  adminLevel: 0,
  firstName: 'Client',
  lastName: 'User'
}

const advisorUser: AuthenticatedUser = {
  id: 'advisor-1',
  email: 'advisor@test.com',
  role: 'ADVISOR',
  adminLevel: 0,
  firstName: 'Advisor',
  lastName: 'User'
}

const lawyerWithAdminLevel: AuthenticatedUser = {
  id: 'lawyer-admin-1',
  email: 'lawyeradmin@test.com',
  role: 'LAWYER',
  adminLevel: 1,
  firstName: 'LawyerAdmin',
  lastName: 'User'
}

describe('RBAC Utilities', () => {
  describe('getAuthUser', () => {
    it('should return user when authenticated', () => {
      const event = createMockEvent(adminUser)
      const user = getAuthUser(event)

      expect(user).toEqual(adminUser)
    })

    it('should throw 401 when no user in context', () => {
      const event = createMockEvent()

      expect(() => getAuthUser(event)).toThrow()
      try {
        getAuthUser(event)
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.message).toBe('Authentication required')
      }
    })
  })

  describe('requireRole', () => {
    it('should allow ADMIN role for admin-only endpoint', () => {
      const event = createMockEvent(adminUser)
      const user = requireRole(event, ['ADMIN'])

      expect(user).toEqual(adminUser)
    })

    it('should allow LAWYER role for lawyer endpoint', () => {
      const event = createMockEvent(lawyerUser)
      const user = requireRole(event, ['LAWYER'])

      expect(user).toEqual(lawyerUser)
    })

    it('should allow multiple roles', () => {
      const event = createMockEvent(lawyerUser)
      const user = requireRole(event, ['ADMIN', 'LAWYER'])

      expect(user).toEqual(lawyerUser)
    })

    it('should deny CLIENT access to admin-only endpoint', () => {
      const event = createMockEvent(clientUser)

      expect(() => requireRole(event, ['ADMIN'])).toThrow()
      try {
        requireRole(event, ['ADMIN'])
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.message).toBe('Insufficient permissions')
      }
    })

    it('should grant ADMIN access to user with adminLevel > 0 even if role is not ADMIN', () => {
      const event = createMockEvent(lawyerWithAdminLevel)
      const user = requireRole(event, ['ADMIN'])

      expect(user).toEqual(lawyerWithAdminLevel)
    })

    it('should not grant non-ADMIN access via adminLevel', () => {
      const event = createMockEvent(lawyerWithAdminLevel)

      expect(() => requireRole(event, ['CLIENT'])).toThrow()
    })
  })

  describe('isAdmin', () => {
    it('should return true for ADMIN role', () => {
      const event = createMockEvent(adminUser)
      expect(isAdmin(event)).toBe(true)
    })

    it('should return true for user with adminLevel > 0', () => {
      const event = createMockEvent(lawyerWithAdminLevel)
      expect(isAdmin(event)).toBe(true)
    })

    it('should return false for regular LAWYER', () => {
      const event = createMockEvent(lawyerUser)
      expect(isAdmin(event)).toBe(false)
    })

    it('should return false for CLIENT', () => {
      const event = createMockEvent(clientUser)
      expect(isAdmin(event)).toBe(false)
    })
  })

  describe('hasAdminLevel', () => {
    it('should return true when user meets required level', () => {
      const event = createMockEvent(adminUser) // adminLevel: 2
      expect(hasAdminLevel(event, 1)).toBe(true)
      expect(hasAdminLevel(event, 2)).toBe(true)
    })

    it('should return false when user does not meet required level', () => {
      const event = createMockEvent(adminUser) // adminLevel: 2
      expect(hasAdminLevel(event, 3)).toBe(false)
    })

    it('should return true for level 0 requirement', () => {
      const event = createMockEvent(clientUser) // adminLevel: 0
      expect(hasAdminLevel(event, 0)).toBe(true)
    })

    it('should return false for non-admin user with level > 0 requirement', () => {
      const event = createMockEvent(clientUser) // adminLevel: 0
      expect(hasAdminLevel(event, 1)).toBe(false)
    })
  })

  describe('requireAdminLevel', () => {
    it('should return user when level is met', () => {
      const event = createMockEvent(adminUser) // adminLevel: 2
      const user = requireAdminLevel(event, 2)

      expect(user).toEqual(adminUser)
    })

    it('should throw 403 when level is not met', () => {
      const event = createMockEvent(lawyerWithAdminLevel) // adminLevel: 1

      expect(() => requireAdminLevel(event, 2)).toThrow()
      try {
        requireAdminLevel(event, 2)
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.message).toBe('Insufficient admin privileges')
      }
    })
  })

  describe('isLawyerOrAdmin', () => {
    it('should return true for LAWYER', () => {
      const event = createMockEvent(lawyerUser)
      expect(isLawyerOrAdmin(event)).toBe(true)
    })

    it('should return true for ADMIN', () => {
      const event = createMockEvent(adminUser)
      expect(isLawyerOrAdmin(event)).toBe(true)
    })

    it('should return true for user with adminLevel > 0', () => {
      const event = createMockEvent(lawyerWithAdminLevel)
      expect(isLawyerOrAdmin(event)).toBe(true)
    })

    it('should return false for CLIENT', () => {
      const event = createMockEvent(clientUser)
      expect(isLawyerOrAdmin(event)).toBe(false)
    })

    it('should return false for ADVISOR', () => {
      const event = createMockEvent(advisorUser)
      expect(isLawyerOrAdmin(event)).toBe(false)
    })
  })

  describe('canAccessClient', () => {
    const targetClientId = 'client-1'

    it('should allow LAWYER to access any client', () => {
      const event = createMockEvent(lawyerUser)
      expect(canAccessClient(event, targetClientId)).toBe(true)
      expect(canAccessClient(event, 'other-client')).toBe(true)
    })

    it('should allow ADMIN to access any client', () => {
      const event = createMockEvent(adminUser)
      expect(canAccessClient(event, targetClientId)).toBe(true)
      expect(canAccessClient(event, 'other-client')).toBe(true)
    })

    it('should allow user with adminLevel to access any client', () => {
      const event = createMockEvent(lawyerWithAdminLevel)
      expect(canAccessClient(event, targetClientId)).toBe(true)
    })

    it('should allow CLIENT to access their own data', () => {
      const event = createMockEvent(clientUser) // id: 'client-1'
      expect(canAccessClient(event, 'client-1')).toBe(true)
    })

    it('should deny CLIENT access to other client data', () => {
      const event = createMockEvent(clientUser)
      expect(canAccessClient(event, 'other-client')).toBe(false)
    })

    it('should deny ADVISOR access to client data', () => {
      const event = createMockEvent(advisorUser)
      expect(canAccessClient(event, targetClientId)).toBe(false)
    })
  })

  describe('requireClientAccess', () => {
    it('should return user when access is granted', () => {
      const event = createMockEvent(lawyerUser)
      const user = requireClientAccess(event, 'any-client')

      expect(user).toEqual(lawyerUser)
    })

    it('should return user when client accesses own data', () => {
      const event = createMockEvent(clientUser)
      const user = requireClientAccess(event, 'client-1')

      expect(user).toEqual(clientUser)
    })

    it('should throw 403 when client tries to access other client data', () => {
      const event = createMockEvent(clientUser)

      expect(() => requireClientAccess(event, 'other-client')).toThrow()
      try {
        requireClientAccess(event, 'other-client')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.message).toBe('Access denied')
      }
    })
  })
})
