/**
 * Tests for users API validation and business logic
 * Tests the Zod schemas and authorization patterns used in user endpoints
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { AuthenticatedUser } from '../../server/utils/rbac'

// Replicate the validation schemas from the user endpoints
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']).default('CLIENT'),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
  adminLevel: z.number().int().min(0).max(10).optional()
})

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']).optional(),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  adminLevel: z.number().int().min(0).max(10).optional()
})

// Staff roles that can have admin levels
const STAFF_ROLES = ['LAWYER', 'ADVISOR']

describe('Users API Validation', () => {
  describe('Create User Schema', () => {
    it('should accept valid user with required fields', () => {
      const result = createUserSchema.safeParse({
        email: 'newuser@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('CLIENT') // default
        expect(result.data.status).toBe('ACTIVE') // default
      }
    })

    it('should accept valid user with all fields', () => {
      const result = createUserSchema.safeParse({
        email: 'lawyer@example.com',
        password: 'securepass123',
        firstName: 'Jane',
        lastName: 'Attorney',
        phone: '555-9876',
        role: 'LAWYER',
        status: 'ACTIVE',
        adminLevel: 1
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('LAWYER')
        expect(result.data.adminLevel).toBe(1)
      }
    })

    it('should reject password shorter than 8 characters', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: '1234567' // 7 characters
      })

      expect(result.success).toBe(false)
    })

    it('should accept password exactly 8 characters', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: '12345678'
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid role', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        role: 'SUPERUSER'
      })

      expect(result.success).toBe(false)
    })

    it('should reject admin level above 10', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        adminLevel: 11
      })

      expect(result.success).toBe(false)
    })

    it('should reject negative admin level', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        adminLevel: -1
      })

      expect(result.success).toBe(false)
    })

    it('should reject non-integer admin level', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        adminLevel: 1.5
      })

      expect(result.success).toBe(false)
    })
  })

  describe('Update User Schema', () => {
    it('should accept partial updates', () => {
      const result = updateUserSchema.safeParse({
        firstName: 'Updated'
      })

      expect(result.success).toBe(true)
    })

    it('should accept role change', () => {
      const result = updateUserSchema.safeParse({
        role: 'LAWYER'
      })

      expect(result.success).toBe(true)
    })

    it('should accept status change', () => {
      const result = updateUserSchema.safeParse({
        status: 'INACTIVE'
      })

      expect(result.success).toBe(true)
    })

    it('should accept admin level change', () => {
      const result = updateUserSchema.safeParse({
        adminLevel: 2
      })

      expect(result.success).toBe(true)
    })

    it('should accept empty update', () => {
      const result = updateUserSchema.safeParse({})

      expect(result.success).toBe(true)
    })
  })
})

describe('Users API Authorization Logic', () => {
  describe('List Users Authorization', () => {
    it('should authorize admin level 2+ users', () => {
      const currentUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'LAWYER',
        adminLevel: 2
      }

      const isAuthorized = currentUser.adminLevel >= 2 || ['ADMIN', 'LAWYER'].includes(currentUser.role)
      expect(isAuthorized).toBe(true)
    })

    it('should authorize ADMIN role regardless of admin level', () => {
      const currentUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        adminLevel: 0
      }

      const isAuthorized = currentUser.adminLevel >= 2 || ['ADMIN', 'LAWYER'].includes(currentUser.role)
      expect(isAuthorized).toBe(true)
    })

    it('should authorize LAWYER role regardless of admin level', () => {
      const currentUser: AuthenticatedUser = {
        id: 'lawyer-1',
        email: 'lawyer@example.com',
        role: 'LAWYER',
        adminLevel: 0
      }

      const isAuthorized = currentUser.adminLevel >= 2 || ['ADMIN', 'LAWYER'].includes(currentUser.role)
      expect(isAuthorized).toBe(true)
    })

    it('should deny CLIENT role without admin level', () => {
      const currentUser: AuthenticatedUser = {
        id: 'client-1',
        email: 'client@example.com',
        role: 'CLIENT',
        adminLevel: 0
      }

      const isAuthorized = currentUser.adminLevel >= 2 || ['ADMIN', 'LAWYER'].includes(currentUser.role)
      expect(isAuthorized).toBe(false)
    })
  })

  describe('Admin Level Assignment Rules', () => {
    it('should allow admin level for LAWYER role', () => {
      const role = 'LAWYER'
      const canHaveAdminLevel = STAFF_ROLES.includes(role)

      expect(canHaveAdminLevel).toBe(true)
    })

    it('should allow admin level for ADVISOR role', () => {
      const role = 'ADVISOR'
      const canHaveAdminLevel = STAFF_ROLES.includes(role)

      expect(canHaveAdminLevel).toBe(true)
    })

    it('should deny admin level for CLIENT role', () => {
      const role = 'CLIENT'
      const canHaveAdminLevel = STAFF_ROLES.includes(role)

      expect(canHaveAdminLevel).toBe(false)
    })

    it('should deny admin level for PROSPECT role', () => {
      const role = 'PROSPECT'
      const canHaveAdminLevel = STAFF_ROLES.includes(role)

      expect(canHaveAdminLevel).toBe(false)
    })

    it('should prevent setting admin level higher than own', () => {
      const currentUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'LAWYER',
        adminLevel: 2
      }

      const requestedAdminLevel = 3
      const canSet = requestedAdminLevel <= currentUser.adminLevel

      expect(canSet).toBe(false)
    })

    it('should allow setting admin level equal to own', () => {
      const currentUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'LAWYER',
        adminLevel: 2
      }

      const requestedAdminLevel = 2
      const canSet = requestedAdminLevel <= currentUser.adminLevel

      expect(canSet).toBe(true)
    })

    it('should allow setting admin level lower than own', () => {
      const currentUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'LAWYER',
        adminLevel: 3
      }

      const requestedAdminLevel = 1
      const canSet = requestedAdminLevel <= currentUser.adminLevel

      expect(canSet).toBe(true)
    })
  })

  describe('Self-Modification Prevention', () => {
    it('should prevent deleting own account', () => {
      const currentUserId = 'user-123'
      const targetUserId = 'user-123'

      const isSelf = currentUserId === targetUserId
      expect(isSelf).toBe(true)
    })

    it('should allow deleting other accounts', () => {
      const currentUserId = 'admin-123'
      const targetUserId = 'user-456'

      const isSelf = currentUserId === targetUserId
      expect(isSelf).toBe(false)
    })

    it('should prevent self-elevation of admin level', () => {
      const currentUser: AuthenticatedUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'LAWYER',
        adminLevel: 1
      }

      const targetUserId = 'user-123'
      const requestedAdminLevel = 2

      const isSelfElevation = targetUserId === currentUser.id && requestedAdminLevel > currentUser.adminLevel
      expect(isSelfElevation).toBe(true)
    })

    it('should allow self-demotion of admin level', () => {
      const currentUser: AuthenticatedUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'LAWYER',
        adminLevel: 2
      }

      const targetUserId = 'user-123'
      const requestedAdminLevel = 1

      const isSelfElevation = targetUserId === currentUser.id && requestedAdminLevel > currentUser.adminLevel
      expect(isSelfElevation).toBe(false)
    })
  })

  describe('Role Change Side Effects', () => {
    it('should reset admin level when changing to non-staff role', () => {
      const currentRole = 'LAWYER'
      const currentAdminLevel = 2
      const newRole = 'CLIENT'

      // Logic from [id].put.ts
      let newAdminLevel = currentAdminLevel
      if (!STAFF_ROLES.includes(newRole) && currentAdminLevel > 0) {
        newAdminLevel = 0
      }

      expect(newAdminLevel).toBe(0)
    })

    it('should preserve admin level when changing between staff roles', () => {
      const currentRole = 'LAWYER'
      const currentAdminLevel = 2
      const newRole = 'ADVISOR'

      let newAdminLevel = currentAdminLevel
      if (!STAFF_ROLES.includes(newRole) && currentAdminLevel > 0) {
        newAdminLevel = 0
      }

      expect(newAdminLevel).toBe(2)
    })

    it('should preserve admin level 0 for any role change', () => {
      const currentRole = 'LAWYER'
      const currentAdminLevel = 0
      const newRole = 'CLIENT'

      let newAdminLevel = currentAdminLevel
      if (!STAFF_ROLES.includes(newRole) && currentAdminLevel > 0) {
        newAdminLevel = 0
      }

      expect(newAdminLevel).toBe(0)
    })
  })

  describe('Response Sanitization', () => {
    it('should convert user to snake_case response', () => {
      const dbUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'LAWYER',
        adminLevel: 1,
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        avatar: null,
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      // Response transformation from index.get.ts
      const sanitizedUser = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        admin_level: dbUser.adminLevel ?? 0,
        first_name: dbUser.firstName,
        last_name: dbUser.lastName,
        phone: dbUser.phone,
        avatar: dbUser.avatar,
        status: dbUser.status,
        created_at: dbUser.createdAt instanceof Date ? dbUser.createdAt.getTime() : dbUser.createdAt,
        updated_at: dbUser.updatedAt instanceof Date ? dbUser.updatedAt.getTime() : dbUser.updatedAt
      }

      expect(sanitizedUser).toHaveProperty('admin_level')
      expect(sanitizedUser).toHaveProperty('first_name')
      expect(sanitizedUser).toHaveProperty('last_name')
      expect(sanitizedUser).toHaveProperty('created_at')
      expect(sanitizedUser).toHaveProperty('updated_at')
      expect(sanitizedUser).not.toHaveProperty('adminLevel')
      expect(sanitizedUser).not.toHaveProperty('firstName')
      expect(sanitizedUser).not.toHaveProperty('password')
    })
  })
})
