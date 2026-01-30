/**
 * Centralized route configuration with access control definitions
 *
 * This file serves as the single source of truth for:
 * - Route paths used throughout the application
 * - Access control requirements for each route
 * - Role-based permissions
 *
 * IMPORTANT: Attorney-client privilege requires strict access control.
 * Any changes to route permissions must be reviewed carefully.
 */

export type UserRole = 'ADMIN' | 'LAWYER' | 'STAFF' | 'CLIENT' | 'ADVISOR' | 'LEAD' | 'PROSPECT'

export interface RouteConfig {
  path: string
  /** Human-readable name for test output */
  name: string
  /** Whether authentication is required */
  requiresAuth: boolean
  /**
   * Roles allowed to access this route.
   * Empty array means any authenticated user can access.
   * 'FIRM' is a shorthand for ['ADMIN', 'LAWYER', 'STAFF']
   */
  allowedRoles: UserRole[] | 'FIRM' | 'ANY'
  /** Minimum admin level required (0 = no admin requirement) */
  minAdminLevel?: number
  /** Associated API endpoint that enforces role check */
  apiEndpoint?: string
}

/**
 * Firm member roles - lawyers, staff, and admins who work at the firm
 */
export const FIRM_ROLES: UserRole[] = ['ADMIN', 'LAWYER', 'STAFF']

/**
 * Client-facing roles - users who are clients of the firm
 */
export const CLIENT_ROLES: UserRole[] = ['CLIENT']

/**
 * All valid roles
 */
export const ALL_ROLES: UserRole[] = ['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']

/**
 * Public routes - no authentication required
 */
export const PUBLIC_ROUTES: RouteConfig[] = [
  { path: '/login', name: 'Login', requiresAuth: false, allowedRoles: 'ANY' },
  { path: '/book', name: 'Public Booking', requiresAuth: false, allowedRoles: 'ANY' },
  { path: '/sign/:token', name: 'E-Signature', requiresAuth: false, allowedRoles: 'ANY' },
]

/**
 * Routes accessible by any authenticated user
 */
export const COMMON_ROUTES: RouteConfig[] = [
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true, allowedRoles: 'ANY' },
  { path: '/profile', name: 'Profile', requiresAuth: true, allowedRoles: 'ANY' },
  { path: '/help', name: 'Help', requiresAuth: true, allowedRoles: 'ANY' },
  { path: '/appointments', name: 'Appointments', requiresAuth: true, allowedRoles: 'ANY' },
  { path: '/schedule', name: 'Schedule', requiresAuth: true, allowedRoles: 'ANY' },
  { path: '/activity', name: 'Activity', requiresAuth: true, allowedRoles: 'ANY' },
]

/**
 * Routes restricted to firm members (lawyers, staff, admins)
 * These routes contain confidential client information
 */
export const FIRM_ROUTES: RouteConfig[] = [
  {
    path: '/clients',
    name: 'Client List',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/clients'
  },
  {
    path: '/matters',
    name: 'Matter List',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/matters'
  },
  {
    path: '/documents',
    name: 'Document List',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/documents'
  },
  {
    path: '/templates',
    name: 'Templates',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/templates'
  },
  {
    path: '/journeys',
    name: 'Journey List',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/client-journeys'
  },
  {
    path: '/service-catalog',
    name: 'Service Catalog',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/services'
  },
  {
    path: '/people',
    name: 'People',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/users'
  },
  {
    path: '/billing',
    name: 'Billing Dashboard',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/billing/summary'
  },
  {
    path: '/billing/trust',
    name: 'Trust Accounts',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/trust/accounts'
  },
  {
    path: '/signatures',
    name: 'E-Signatures',
    requiresAuth: true,
    allowedRoles: 'FIRM',
    apiEndpoint: '/api/signature-sessions'
  },
]

/**
 * Routes restricted to admins (adminLevel >= 2)
 * These routes contain system configuration and user management
 */
export const ADMIN_ROUTES: RouteConfig[] = [
  {
    path: '/settings',
    name: 'Settings',
    requiresAuth: true,
    allowedRoles: ['ADMIN'],
    minAdminLevel: 2
  },
  {
    path: '/settings/users',
    name: 'User Management',
    requiresAuth: true,
    allowedRoles: ['ADMIN'],
    minAdminLevel: 2,
    apiEndpoint: '/api/users'
  },
  {
    path: '/settings/oauth-providers',
    name: 'OAuth Providers',
    requiresAuth: true,
    allowedRoles: ['ADMIN'],
    minAdminLevel: 2,
    apiEndpoint: '/api/oauth-providers'
  },
  {
    path: '/settings/calendars',
    name: 'Calendar Administration',
    requiresAuth: true,
    allowedRoles: ['ADMIN'],
    minAdminLevel: 2
  },
  {
    path: '/admin/seed-wydapt',
    name: 'Seed Data',
    requiresAuth: true,
    allowedRoles: ['ADMIN'],
    minAdminLevel: 2
  },
]

/**
 * Routes for clients to access their own data
 * Clients should ONLY see their own matters/documents/journeys
 */
export const CLIENT_ROUTES: RouteConfig[] = [
  {
    path: '/my-matters',
    name: 'My Matters',
    requiresAuth: true,
    allowedRoles: ['CLIENT'],
    apiEndpoint: '/api/my-matters'
  },
  {
    path: '/my-journeys',
    name: 'My Journeys',
    requiresAuth: true,
    allowedRoles: ['CLIENT'],
    apiEndpoint: '/api/my-journeys'
  },
]

/**
 * All protected routes (requires authentication)
 */
export const PROTECTED_ROUTES: RouteConfig[] = [
  ...COMMON_ROUTES,
  ...FIRM_ROUTES,
  ...ADMIN_ROUTES,
  ...CLIENT_ROUTES,
]

/**
 * All routes
 */
export const ALL_ROUTES: RouteConfig[] = [
  ...PUBLIC_ROUTES,
  ...PROTECTED_ROUTES,
]

/**
 * API endpoints with their access requirements
 */
export const API_ACCESS_CONTROL = {
  // Public APIs (no auth required)
  public: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/session',
    '/api/auth/firebase',
    '/api/oauth-providers/enabled',
    '/api/public/*',
    '/api/signature/*', // E-signature public endpoints (token-based access)
  ],

  // Firm-only APIs (lawyer, staff, admin)
  firm: [
    '/api/clients',
    '/api/clients/*',
    '/api/matters',
    '/api/matters/*',
    '/api/documents',
    '/api/documents/*',
    '/api/templates',
    '/api/templates/*',
    '/api/client-journeys',
    '/api/client-journeys/*',
    '/api/services',
    '/api/services/*',
  ],

  // Admin-only APIs
  admin: [
    '/api/users',
    '/api/users/*',
    '/api/oauth-providers',
    '/api/oauth-providers/*',
    '/api/seed/*',
  ],

  // Client-specific APIs (clients access their own data)
  client: [
    '/api/my-matters',
    '/api/my-matters/*',
    '/api/my-journeys',
    '/api/my-journeys/*',
    '/api/my-documents',
    '/api/my-documents/*',
    '/api/client/stats',
    '/api/client/documents',
    '/api/client/appointments',
  ],
} as const

/**
 * Helper to check if a role can access a route
 */
export function canRoleAccessRoute(role: UserRole, adminLevel: number, route: RouteConfig): boolean {
  if (!route.requiresAuth) return true

  // Check admin level requirement
  if (route.minAdminLevel && adminLevel < route.minAdminLevel) {
    return false
  }

  // Any authenticated user
  if (route.allowedRoles === 'ANY') return true

  // Firm members
  if (route.allowedRoles === 'FIRM') {
    return FIRM_ROLES.includes(role) || adminLevel > 0
  }

  // Specific roles
  return route.allowedRoles.includes(role) || (route.allowedRoles.includes('ADMIN') && adminLevel > 0)
}

/**
 * Get routes that a specific role should be able to access
 */
export function getAccessibleRoutes(role: UserRole, adminLevel: number = 0): RouteConfig[] {
  return ALL_ROUTES.filter(route => canRoleAccessRoute(role, adminLevel, route))
}

/**
 * Get routes that a specific role should NOT be able to access
 */
export function getRestrictedRoutes(role: UserRole, adminLevel: number = 0): RouteConfig[] {
  return PROTECTED_ROUTES.filter(route => !canRoleAccessRoute(role, adminLevel, route))
}
