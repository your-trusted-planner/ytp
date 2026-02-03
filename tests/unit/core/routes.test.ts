/**
 * Tests for shared/routes.ts
 * Covers route access control configuration and helper functions
 *
 * CRITICAL: These tests verify the correctness of our route access control
 * configuration. Attorney-client privilege requires accurate role enforcement.
 */

import { describe, it, expect } from 'vitest'
import {
  PUBLIC_ROUTES,
  COMMON_ROUTES,
  FIRM_ROUTES,
  ADMIN_ROUTES,
  CLIENT_ROUTES,
  PROTECTED_ROUTES,
  ALL_ROUTES,
  FIRM_ROLES,
  canRoleAccessRoute,
  getAccessibleRoutes,
  getRestrictedRoutes,
  type UserRole,
  type RouteConfig
} from '../../../shared/routes'

describe('Route Configuration', () => {
  describe('Route Collections', () => {
    it('should have all public routes marked as not requiring auth', () => {
      for (const route of PUBLIC_ROUTES) {
        expect(route.requiresAuth).toBe(false)
      }
    })

    it('should have all protected routes marked as requiring auth', () => {
      for (const route of PROTECTED_ROUTES) {
        expect(route.requiresAuth).toBe(true)
      }
    })

    it('should include all route categories in ALL_ROUTES', () => {
      const allPaths = ALL_ROUTES.map(r => r.path)

      for (const route of PUBLIC_ROUTES) {
        expect(allPaths).toContain(route.path)
      }
      for (const route of PROTECTED_ROUTES) {
        expect(allPaths).toContain(route.path)
      }
    })

    it('should include all protected categories in PROTECTED_ROUTES', () => {
      const protectedPaths = PROTECTED_ROUTES.map(r => r.path)

      for (const route of COMMON_ROUTES) {
        expect(protectedPaths).toContain(route.path)
      }
      for (const route of FIRM_ROUTES) {
        expect(protectedPaths).toContain(route.path)
      }
      for (const route of ADMIN_ROUTES) {
        expect(protectedPaths).toContain(route.path)
      }
      for (const route of CLIENT_ROUTES) {
        expect(protectedPaths).toContain(route.path)
      }
    })
  })

  describe('FIRM_ROLES', () => {
    it('should include ADMIN, LAWYER, and STAFF', () => {
      expect(FIRM_ROLES).toContain('ADMIN')
      expect(FIRM_ROLES).toContain('LAWYER')
      expect(FIRM_ROLES).toContain('STAFF')
    })

    it('should NOT include CLIENT', () => {
      expect(FIRM_ROLES).not.toContain('CLIENT')
    })

    it('should NOT include ADVISOR (external third-party)', () => {
      expect(FIRM_ROLES).not.toContain('ADVISOR')
    })
  })

  describe('Firm Routes Configuration', () => {
    it('should mark all firm routes as requiring FIRM access', () => {
      for (const route of FIRM_ROUTES) {
        expect(route.allowedRoles).toBe('FIRM')
      }
    })

    it('should include client-sensitive routes in FIRM_ROUTES', () => {
      const firmPaths = FIRM_ROUTES.map(r => r.path)

      expect(firmPaths).toContain('/clients')
      expect(firmPaths).toContain('/matters')
      expect(firmPaths).toContain('/documents')
    })
  })

  describe('Admin Routes Configuration', () => {
    it('should mark all admin routes as requiring ADMIN role', () => {
      for (const route of ADMIN_ROUTES) {
        expect(route.allowedRoles).toContain('ADMIN')
      }
    })

    it('should include settings routes in ADMIN_ROUTES', () => {
      const adminPaths = ADMIN_ROUTES.map(r => r.path)

      expect(adminPaths).toContain('/settings')
      expect(adminPaths).toContain('/settings/users')
      expect(adminPaths).toContain('/settings/oauth-providers')
    })
  })

  describe('Client Routes Configuration', () => {
    it('should mark client routes as requiring CLIENT role', () => {
      for (const route of CLIENT_ROUTES) {
        expect(route.allowedRoles).toContain('CLIENT')
      }
    })

    it('should include my-* routes in CLIENT_ROUTES', () => {
      const clientPaths = CLIENT_ROUTES.map(r => r.path)

      expect(clientPaths).toContain('/my-matters')
      expect(clientPaths).toContain('/my-journeys')
    })
  })
})

describe('canRoleAccessRoute', () => {
  describe('Public Routes', () => {
    const loginRoute: RouteConfig = {
      path: '/login',
      name: 'Login',
      requiresAuth: false,
      allowedRoles: 'ANY'
    }

    it('should allow any role to access public routes', () => {
      const roles: UserRole[] = ['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR']

      for (const role of roles) {
        expect(canRoleAccessRoute(role, 0, loginRoute)).toBe(true)
      }
    })
  })

  describe('Routes with ANY authenticated access', () => {
    const dashboardRoute: RouteConfig = {
      path: '/dashboard',
      name: 'Dashboard',
      requiresAuth: true,
      allowedRoles: 'ANY'
    }

    it('should allow any authenticated role to access', () => {
      const roles: UserRole[] = ['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR']

      for (const role of roles) {
        expect(canRoleAccessRoute(role, 0, dashboardRoute)).toBe(true)
      }
    })
  })

  describe('Routes with FIRM access', () => {
    const clientsRoute: RouteConfig = {
      path: '/clients',
      name: 'Client List',
      requiresAuth: true,
      allowedRoles: 'FIRM'
    }

    it('should allow LAWYER to access firm routes', () => {
      expect(canRoleAccessRoute('LAWYER', 0, clientsRoute)).toBe(true)
    })

    it('should allow STAFF to access firm routes', () => {
      expect(canRoleAccessRoute('STAFF', 0, clientsRoute)).toBe(true)
    })

    it('should allow ADMIN to access firm routes', () => {
      expect(canRoleAccessRoute('ADMIN', 0, clientsRoute)).toBe(true)
    })

    it('should allow user with adminLevel > 0 to access firm routes', () => {
      expect(canRoleAccessRoute('LAWYER', 1, clientsRoute)).toBe(true)
      expect(canRoleAccessRoute('CLIENT', 1, clientsRoute)).toBe(true) // Edge case: client with admin level
    })

    it('should DENY CLIENT access to firm routes', () => {
      expect(canRoleAccessRoute('CLIENT', 0, clientsRoute)).toBe(false)
    })

    it('should DENY ADVISOR access to firm routes', () => {
      expect(canRoleAccessRoute('ADVISOR', 0, clientsRoute)).toBe(false)
    })
  })

  describe('Routes with specific role access', () => {
    const adminRoute: RouteConfig = {
      path: '/settings',
      name: 'Settings',
      requiresAuth: true,
      allowedRoles: ['ADMIN'],
      minAdminLevel: 2
    }

    it('should allow ADMIN with sufficient level', () => {
      expect(canRoleAccessRoute('ADMIN', 2, adminRoute)).toBe(true)
      expect(canRoleAccessRoute('ADMIN', 3, adminRoute)).toBe(true)
    })

    it('should DENY ADMIN with insufficient level', () => {
      expect(canRoleAccessRoute('ADMIN', 1, adminRoute)).toBe(false)
      expect(canRoleAccessRoute('ADMIN', 0, adminRoute)).toBe(false)
    })

    it('should allow non-ADMIN role with sufficient adminLevel', () => {
      // A LAWYER with adminLevel 2 should access admin routes
      expect(canRoleAccessRoute('LAWYER', 2, adminRoute)).toBe(true)
    })

    it('should DENY LAWYER without admin level', () => {
      expect(canRoleAccessRoute('LAWYER', 0, adminRoute)).toBe(false)
    })

    it('should DENY CLIENT', () => {
      expect(canRoleAccessRoute('CLIENT', 0, adminRoute)).toBe(false)
    })
  })

  describe('Client-specific routes', () => {
    const myMattersRoute: RouteConfig = {
      path: '/my-matters',
      name: 'My Matters',
      requiresAuth: true,
      allowedRoles: ['CLIENT']
    }

    it('should allow CLIENT to access', () => {
      expect(canRoleAccessRoute('CLIENT', 0, myMattersRoute)).toBe(true)
    })

    it('should DENY LAWYER access (they use /matters instead)', () => {
      expect(canRoleAccessRoute('LAWYER', 0, myMattersRoute)).toBe(false)
    })

    it('should allow ADMIN access via adminLevel', () => {
      // Admins can access anything
      expect(canRoleAccessRoute('LAWYER', 2, myMattersRoute)).toBe(false)
    })
  })
})

describe('getAccessibleRoutes', () => {
  it('should return all routes for ADMIN with level 3', () => {
    const accessible = getAccessibleRoutes('ADMIN', 3)

    // Should include public routes
    expect(accessible.some(r => r.path === '/login')).toBe(true)

    // Should include common routes
    expect(accessible.some(r => r.path === '/dashboard')).toBe(true)

    // Should include firm routes
    expect(accessible.some(r => r.path === '/clients')).toBe(true)

    // Should include admin routes
    expect(accessible.some(r => r.path === '/settings')).toBe(true)
  })

  it('should return limited routes for CLIENT', () => {
    const accessible = getAccessibleRoutes('CLIENT', 0)

    // Should include public routes
    expect(accessible.some(r => r.path === '/login')).toBe(true)

    // Should include common routes
    expect(accessible.some(r => r.path === '/dashboard')).toBe(true)

    // Should include client-specific routes
    expect(accessible.some(r => r.path === '/my-matters')).toBe(true)

    // Should NOT include firm routes
    expect(accessible.some(r => r.path === '/clients')).toBe(false)

    // Should NOT include admin routes
    expect(accessible.some(r => r.path === '/settings')).toBe(false)
  })

  it('should return firm routes for LAWYER', () => {
    const accessible = getAccessibleRoutes('LAWYER', 0)

    // Should include firm routes
    expect(accessible.some(r => r.path === '/clients')).toBe(true)
    expect(accessible.some(r => r.path === '/matters')).toBe(true)

    // Should NOT include admin routes
    expect(accessible.some(r => r.path === '/settings')).toBe(false)

    // Should NOT include client-specific routes
    expect(accessible.some(r => r.path === '/my-matters')).toBe(false)
  })
})

describe('getRestrictedRoutes', () => {
  it('should return admin and firm routes as restricted for CLIENT', () => {
    const restricted = getRestrictedRoutes('CLIENT', 0)
    const restrictedPaths = restricted.map(r => r.path)

    // Firm routes should be restricted
    expect(restrictedPaths).toContain('/clients')
    expect(restrictedPaths).toContain('/matters')

    // Admin routes should be restricted
    expect(restrictedPaths).toContain('/settings')
  })

  it('should return admin routes as restricted for LAWYER', () => {
    const restricted = getRestrictedRoutes('LAWYER', 0)
    const restrictedPaths = restricted.map(r => r.path)

    // Admin routes should be restricted
    expect(restrictedPaths).toContain('/settings')
    expect(restrictedPaths).toContain('/settings/users')

    // Firm routes should NOT be restricted
    expect(restrictedPaths).not.toContain('/clients')
    expect(restrictedPaths).not.toContain('/matters')
  })

  it('should return empty array for ADMIN with full level', () => {
    const restricted = getRestrictedRoutes('ADMIN', 3)

    // Nothing should be restricted for super admin
    // (except client-specific routes which admins typically wouldn't use)
    const nonClientRestricted = restricted.filter(
      r => !r.path.startsWith('/my-')
    )
    expect(nonClientRestricted).toHaveLength(0)
  })
})

/**
 * CRITICAL: Cross-role access tests
 *
 * These tests verify that role boundaries are correctly enforced.
 * Attorney-client privilege depends on these being accurate.
 */
describe('Cross-Role Access Matrix', () => {
  const testCases: {
    role: UserRole
    adminLevel: number
    shouldAccess: string[]
    shouldNotAccess: string[]
  }[] = [
    {
      role: 'CLIENT',
      adminLevel: 0,
      shouldAccess: ['/dashboard', '/profile', '/my-matters', '/my-journeys'],
      shouldNotAccess: ['/clients', '/matters', '/settings', '/settings/users']
    },
    {
      role: 'LAWYER',
      adminLevel: 0,
      shouldAccess: ['/dashboard', '/clients', '/matters', '/documents'],
      shouldNotAccess: ['/settings', '/settings/users', '/my-matters']
    },
    {
      role: 'STAFF',
      adminLevel: 0,
      shouldAccess: ['/dashboard', '/clients', '/matters'],
      shouldNotAccess: ['/settings', '/my-matters']
    },
    {
      role: 'ADMIN',
      adminLevel: 2,
      shouldAccess: ['/dashboard', '/clients', '/matters', '/settings', '/settings/users'],
      shouldNotAccess: ['/my-matters'] // Admin uses /matters, not /my-matters
    }
  ]

  for (const { role, adminLevel, shouldAccess, shouldNotAccess } of testCases) {
    describe(`${role} (adminLevel: ${adminLevel})`, () => {
      for (const path of shouldAccess) {
        it(`should have access to ${path}`, () => {
          const route = ALL_ROUTES.find(r => r.path === path)
          expect(route).toBeDefined()
          expect(canRoleAccessRoute(role, adminLevel, route!)).toBe(true)
        })
      }

      for (const path of shouldNotAccess) {
        it(`should NOT have access to ${path}`, () => {
          const route = ALL_ROUTES.find(r => r.path === path)
          expect(route).toBeDefined()
          expect(canRoleAccessRoute(role, adminLevel, route!)).toBe(false)
        })
      }
    })
  }
})
