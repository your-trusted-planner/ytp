import { eq, and, sql, sum } from 'drizzle-orm'

/**
 * Trust Ledger Utilities
 *
 * Handles balance calculations, validations, and ledger operations
 * for the trust accounting system.
 *
 * Key Rules:
 * - Client funds in trust are NOT the firm's money until earned
 * - Every dollar must be attributable to a specific client
 * - Cannot disburse more than client's available balance
 * - Running balances maintained for audit trail
 */

interface TrustBalance {
  clientId: string
  matterId: string | null
  balance: number // cents
}

interface TransactionResult {
  success: boolean
  transactionId?: string
  newBalance?: number
  error?: string
}

/**
 * Get the current trust balance for a client
 * @param clientId The client ID
 * @param matterId Optional matter ID for matter-specific balance
 * @returns The balance in cents
 */
export async function getClientTrustBalance(
  clientId: string,
  matterId?: string
): Promise<number> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const conditions = [eq(schema.clientTrustLedgers.clientId, clientId)]

  if (matterId) {
    conditions.push(eq(schema.clientTrustLedgers.matterId, matterId))
  }

  const [ledger] = await db
    .select({ balance: schema.clientTrustLedgers.balance })
    .from(schema.clientTrustLedgers)
    .where(and(...conditions))
    .limit(1)

  return ledger?.balance ?? 0
}

/**
 * Get all trust balances for a client (across all matters)
 * @param clientId The client ID
 * @returns Array of balances by matter
 */
export async function getClientTrustBalances(clientId: string): Promise<TrustBalance[]> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const ledgers = await db
    .select({
      clientId: schema.clientTrustLedgers.clientId,
      matterId: schema.clientTrustLedgers.matterId,
      balance: schema.clientTrustLedgers.balance
    })
    .from(schema.clientTrustLedgers)
    .where(eq(schema.clientTrustLedgers.clientId, clientId))

  return ledgers
}

/**
 * Get or create a client trust ledger entry
 * @param trustAccountId The trust account ID
 * @param clientId The client ID
 * @param matterId Optional matter ID
 * @returns The ledger entry ID
 */
export async function getOrCreateLedger(
  trustAccountId: string,
  clientId: string,
  matterId?: string | null
): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const conditions = [
    eq(schema.clientTrustLedgers.trustAccountId, trustAccountId),
    eq(schema.clientTrustLedgers.clientId, clientId)
  ]

  if (matterId) {
    conditions.push(eq(schema.clientTrustLedgers.matterId, matterId))
  } else {
    conditions.push(sql`${schema.clientTrustLedgers.matterId} IS NULL`)
  }

  // Try to find existing ledger
  const [existing] = await db
    .select({ id: schema.clientTrustLedgers.id })
    .from(schema.clientTrustLedgers)
    .where(and(...conditions))
    .limit(1)

  if (existing) {
    return existing.id
  }

  // Create new ledger
  const ledgerId = crypto.randomUUID()
  await db.insert(schema.clientTrustLedgers).values({
    id: ledgerId,
    trustAccountId,
    clientId,
    matterId: matterId ?? null,
    balance: 0
  })

  return ledgerId
}

/**
 * Update the client trust ledger balance
 * @param trustAccountId The trust account ID
 * @param clientId The client ID
 * @param matterId Optional matter ID
 * @param delta The amount to add (positive) or subtract (negative)
 * @returns The new balance
 */
export async function updateLedgerBalance(
  trustAccountId: string,
  clientId: string,
  matterId: string | null,
  delta: number
): Promise<number> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // Get or create the ledger
  const ledgerId = await getOrCreateLedger(trustAccountId, clientId, matterId)

  // Get current balance
  const [current] = await db
    .select({ balance: schema.clientTrustLedgers.balance })
    .from(schema.clientTrustLedgers)
    .where(eq(schema.clientTrustLedgers.id, ledgerId))

  const currentBalance = current?.balance ?? 0
  const newBalance = currentBalance + delta

  // Update the ledger
  await db
    .update(schema.clientTrustLedgers)
    .set({
      balance: newBalance,
      updatedAt: new Date()
    })
    .where(eq(schema.clientTrustLedgers.id, ledgerId))

  return newBalance
}

/**
 * Update the trust account total balance
 * @param trustAccountId The trust account ID
 * @param delta The amount to add (positive) or subtract (negative)
 * @returns The new total balance
 */
export async function updateTrustAccountBalance(
  trustAccountId: string,
  delta: number
): Promise<number> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // Get current balance
  const [account] = await db
    .select({ currentBalance: schema.trustAccounts.currentBalance })
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.id, trustAccountId))

  if (!account) {
    throw new Error('Trust account not found')
  }

  const newBalance = account.currentBalance + delta

  // Update the account
  await db
    .update(schema.trustAccounts)
    .set({
      currentBalance: newBalance,
      updatedAt: new Date()
    })
    .where(eq(schema.trustAccounts.id, trustAccountId))

  return newBalance
}

/**
 * Validate that a disbursement amount doesn't exceed available balance
 * @param clientId The client ID
 * @param amount The disbursement amount (positive, in cents)
 * @param matterId Optional matter ID
 * @returns Object with isValid and availableBalance
 */
export async function validateDisbursement(
  clientId: string,
  amount: number,
  matterId?: string
): Promise<{ isValid: boolean; availableBalance: number; shortfall: number }> {
  const balance = await getClientTrustBalance(clientId, matterId)

  return {
    isValid: balance >= amount,
    availableBalance: balance,
    shortfall: amount > balance ? amount - balance : 0
  }
}

/**
 * Calculate the sum of all client ledger balances
 * Used for three-way reconciliation
 * @param trustAccountId The trust account ID
 * @returns Total of all client balances
 */
export async function sumClientBalances(trustAccountId: string): Promise<number> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.clientTrustLedgers.balance}), 0)`
    })
    .from(schema.clientTrustLedgers)
    .where(eq(schema.clientTrustLedgers.trustAccountId, trustAccountId))

  return result?.total ?? 0
}

/**
 * Get the default/active trust account
 * @returns The active trust account or null
 */
export async function getActiveTrustAccount(): Promise<{
  id: string
  accountName: string
  currentBalance: number
} | null> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const [account] = await db
    .select({
      id: schema.trustAccounts.id,
      accountName: schema.trustAccounts.accountName,
      currentBalance: schema.trustAccounts.currentBalance
    })
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.isActive, true))
    .limit(1)

  return account ?? null
}
