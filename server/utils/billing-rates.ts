import { eq } from 'drizzle-orm'

/**
 * Billing Rate Resolution Utility
 *
 * Resolves hourly rates following a priority hierarchy with role-based rates:
 * 1. Matter user-specific rate (userRates JSON)
 * 2. Matter role-based rate (attorney vs staff based on user's role)
 * 3. Client user-specific rate (userRates JSON)
 * 4. Client role-based rate (attorney vs staff based on user's role)
 * 5. Catalog role-based rate (attorney vs staff based on user's role)
 * 6. User's default rate (defaultHourlyRate on the user record)
 * 7. No rate found (rate: 0, source: 'none')
 */

export type RateSource =
  | 'matter_user'
  | 'matter_attorney'
  | 'matter_staff'
  | 'client_user'
  | 'client_attorney'
  | 'client_staff'
  | 'catalog_attorney'
  | 'catalog_staff'
  | 'user_default'
  | 'none'

export interface ResolvedRate {
  rate: number // Cents
  source: RateSource
}

export interface RateContext {
  matterId: string
  userId: string
  catalogId?: string
}

type UserRole = 'ADMIN' | 'LAWYER' | 'STAFF' | 'CLIENT' | 'ADVISOR' | 'LEAD' | 'PROSPECT'

/**
 * Determines if a user role is an attorney (LAWYER) or staff (STAFF).
 * Returns null for roles that don't have billing rates (ADMIN, CLIENT, etc.)
 */
function getRateCategoryForRole(role: UserRole): 'attorney' | 'staff' | null {
  if (role === 'LAWYER') return 'attorney'
  if (role === 'STAFF') return 'staff'
  return null // ADMIN, CLIENT, etc. don't have default rates
}

/**
 * Resolves the hourly rate for a given context following the priority hierarchy.
 */
export async function resolveHourlyRate(context: RateContext): Promise<ResolvedRate> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // First, get the user's role and default rate
  const [user] = await db
    .select({
      role: schema.users.role,
      defaultHourlyRate: schema.users.defaultHourlyRate
    })
    .from(schema.users)
    .where(eq(schema.users.id, context.userId))
    .limit(1)

  if (!user) {
    return { rate: 0, source: 'none' }
  }

  const rateCategory = getRateCategoryForRole(user.role as UserRole)
  const userDefaultRate = user.defaultHourlyRate

  // 1. Check matter-level rates (highest priority)
  const [matterRate] = await db
    .select()
    .from(schema.matterBillingRates)
    .where(eq(schema.matterBillingRates.matterId, context.matterId))
    .limit(1)

  if (matterRate) {
    // 1a. Check user-specific rate at matter level
    if (matterRate.userRates) {
      try {
        const userRates = JSON.parse(matterRate.userRates) as Record<string, number>
        const userRate = userRates[context.userId]
        if (userRate !== undefined && userRate > 0) {
          return { rate: userRate, source: 'matter_user' }
        }
      } catch {
        // Invalid JSON, continue to next check
      }
    }

    // 1b. Check matter role-based rate
    if (rateCategory === 'attorney' && matterRate.attorneyRate && matterRate.attorneyRate > 0) {
      return { rate: matterRate.attorneyRate, source: 'matter_attorney' }
    }
    if (rateCategory === 'staff' && matterRate.staffRate && matterRate.staffRate > 0) {
      return { rate: matterRate.staffRate, source: 'matter_staff' }
    }
  }

  // 2. Get client ID from matter
  const [matter] = await db
    .select({
      clientId: schema.matters.clientId
    })
    .from(schema.matters)
    .where(eq(schema.matters.id, context.matterId))
    .limit(1)

  if (!matter) {
    // Matter not found, skip to catalog fallbacks
    return resolveFromCatalog(db, schema, context, rateCategory, userDefaultRate)
  }

  // 3. Check client-level rates
  let actualClientId = matter.clientId

  // Try to find a client record
  const [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.id, matter.clientId))
    .limit(1)

  if (client) {
    actualClientId = client.id
  }

  const [clientRate] = await db
    .select()
    .from(schema.clientBillingRates)
    .where(eq(schema.clientBillingRates.clientId, actualClientId))
    .limit(1)

  if (clientRate) {
    // 3a. Check user-specific rate at client level
    if (clientRate.userRates) {
      try {
        const userRates = JSON.parse(clientRate.userRates) as Record<string, number>
        const clientUserRate = userRates[context.userId]
        if (clientUserRate !== undefined && clientUserRate > 0) {
          return { rate: clientUserRate, source: 'client_user' }
        }
      } catch {
        // Invalid JSON, continue to next check
      }
    }

    // 3b. Check client role-based rate
    if (rateCategory === 'attorney' && clientRate.attorneyRate && clientRate.attorneyRate > 0) {
      return { rate: clientRate.attorneyRate, source: 'client_attorney' }
    }
    if (rateCategory === 'staff' && clientRate.staffRate && clientRate.staffRate > 0) {
      return { rate: clientRate.staffRate, source: 'client_staff' }
    }
  }

  // 4. Fall back to catalog rates, then user default
  return resolveFromCatalog(db, schema, context, rateCategory, userDefaultRate)
}

/**
 * Helper to resolve rates from catalog item, then user default
 */
async function resolveFromCatalog(
  db: ReturnType<typeof import('../db').useDrizzle>,
  schema: typeof import('../db').schema,
  context: RateContext,
  rateCategory: 'attorney' | 'staff' | null,
  userDefaultRate: number | null | undefined
): Promise<ResolvedRate> {
  // Check catalog item role-based rates
  if (context.catalogId) {
    const [catalogItem] = await db
      .select({
        defaultAttorneyRate: schema.serviceCatalog.defaultAttorneyRate,
        defaultStaffRate: schema.serviceCatalog.defaultStaffRate
      })
      .from(schema.serviceCatalog)
      .where(eq(schema.serviceCatalog.id, context.catalogId))
      .limit(1)

    if (catalogItem) {
      if (rateCategory === 'attorney' && catalogItem.defaultAttorneyRate && catalogItem.defaultAttorneyRate > 0) {
        return { rate: catalogItem.defaultAttorneyRate, source: 'catalog_attorney' }
      }
      if (rateCategory === 'staff' && catalogItem.defaultStaffRate && catalogItem.defaultStaffRate > 0) {
        return { rate: catalogItem.defaultStaffRate, source: 'catalog_staff' }
      }
    }
  }

  // 5. Fall back to user's default rate
  if (userDefaultRate && userDefaultRate > 0) {
    return { rate: userDefaultRate, source: 'user_default' }
  }

  // No rate found
  return { rate: 0, source: 'none' }
}

/**
 * Parses a quantity string to a number, handling decimal values.
 * Used for invoice line items and time entries.
 */
export function parseQuantity(quantity: string | number): number {
  if (typeof quantity === 'number') return quantity
  const parsed = parseFloat(quantity)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Calculates the amount for a time entry based on hours and rate.
 * Returns amount in cents.
 */
export function calculateTimeEntryAmount(hours: string | number, hourlyRate: number): number {
  const hoursNum = parseQuantity(hours)
  return Math.round(hoursNum * hourlyRate)
}

/**
 * Formats a rate source into a human-readable string for UI display.
 */
export function formatRateSource(source: RateSource): string {
  const labels: Record<RateSource, string> = {
    matter_user: 'Matter (User-specific)',
    matter_attorney: 'Matter (Attorney Rate)',
    matter_staff: 'Matter (Staff Rate)',
    client_user: 'Client (User-specific)',
    client_attorney: 'Client (Attorney Rate)',
    client_staff: 'Client (Staff Rate)',
    catalog_attorney: 'Service (Attorney Rate)',
    catalog_staff: 'Service (Staff Rate)',
    user_default: 'User Default',
    none: 'No Rate Set'
  }
  return labels[source]
}
