import { eq, and, sql, gte, lt, desc, asc } from 'drizzle-orm'
import { sumClientBalances } from './trust-ledger'

/**
 * Trust Reports Utilities
 *
 * Generates trust accounting reports:
 * - Three-way reconciliation
 * - Trust balance aging
 * - Client ledger statements
 */

interface ReconciliationResult {
  trustAccountId: string
  accountName: string
  asOf: Date
  bankBalance: number // Manual entry or from bank feed
  trustLedgerBalance: number // From trust_accounts.current_balance
  sumClientBalances: number // Sum of all client_trust_ledgers.balance
  isBalanced: boolean
  variance: number
  clientCount: number
}

interface AgingBucket {
  current: number // 0-30 days
  days30to60: number
  days60to90: number
  over90: number
  total: number
}

interface ClientAgingEntry {
  clientId: string
  clientName: string
  matterId: string | null
  matterTitle: string | null
  aging: AgingBucket
  oldestDeposit: Date | null
}

interface TrustAgingReport {
  trustAccountId: string
  asOf: Date
  totals: AgingBucket
  clients: ClientAgingEntry[]
}

interface LedgerEntry {
  id: string
  transactionDate: Date
  transactionType: string
  description: string
  deposit: number | null // Positive amounts
  disbursement: number | null // Negative amounts (shown as positive)
  runningBalance: number
  referenceNumber: string | null
  checkNumber: string | null
}

interface ClientLedgerStatement {
  clientId: string
  clientName: string
  matterId: string | null
  matterTitle: string | null
  trustAccountId: string
  trustAccountName: string
  periodStart: Date
  periodEnd: Date
  openingBalance: number
  totalDeposits: number
  totalDisbursements: number
  closingBalance: number
  entries: LedgerEntry[]
}

/**
 * Generate a three-way reconciliation report
 * Compares: Bank balance = Trust ledger total = Sum of client balances
 *
 * @param trustAccountId The trust account ID
 * @param bankBalance The bank balance (manual entry or from bank feed)
 * @returns Reconciliation result
 */
export async function generateReconciliation(
  trustAccountId: string,
  bankBalance: number
): Promise<ReconciliationResult> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // Get trust account
  const [account] = await db
    .select({
      id: schema.trustAccounts.id,
      accountName: schema.trustAccounts.accountName,
      currentBalance: schema.trustAccounts.currentBalance
    })
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.id, trustAccountId))

  if (!account) {
    throw new Error('Trust account not found')
  }

  // Get sum of all client balances
  const clientSum = await sumClientBalances(trustAccountId)

  // Count clients with balances
  const [countResult] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${schema.clientTrustLedgers.clientId})`
    })
    .from(schema.clientTrustLedgers)
    .where(
      and(
        eq(schema.clientTrustLedgers.trustAccountId, trustAccountId),
        sql`${schema.clientTrustLedgers.balance} != 0`
      )
    )

  const trustLedgerBalance = account.currentBalance
  const variance = bankBalance - trustLedgerBalance

  return {
    trustAccountId,
    accountName: account.accountName,
    asOf: new Date(),
    bankBalance,
    trustLedgerBalance,
    sumClientBalances: clientSum,
    isBalanced: variance === 0 && trustLedgerBalance === clientSum,
    variance,
    clientCount: countResult?.count ?? 0
  }
}

/**
 * Generate a trust balance aging report
 * Shows how long client funds have been held in trust
 *
 * @param trustAccountId The trust account ID
 * @returns Aging report
 */
export async function generateAgingReport(trustAccountId: string): Promise<TrustAgingReport> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Get all client ledgers with balances
  const ledgers = await db
    .select({
      clientId: schema.clientTrustLedgers.clientId,
      matterId: schema.clientTrustLedgers.matterId,
      balance: schema.clientTrustLedgers.balance
    })
    .from(schema.clientTrustLedgers)
    .where(
      and(
        eq(schema.clientTrustLedgers.trustAccountId, trustAccountId),
        sql`${schema.clientTrustLedgers.balance} > 0`
      )
    )

  const clients: ClientAgingEntry[] = []
  const totals: AgingBucket = {
    current: 0,
    days30to60: 0,
    days60to90: 0,
    over90: 0,
    total: 0
  }

  for (const ledger of ledgers) {
    // Get the oldest uncleared deposit for this client/matter
    const [oldestDeposit] = await db
      .select({
        transactionDate: schema.trustTransactions.transactionDate
      })
      .from(schema.trustTransactions)
      .where(
        and(
          eq(schema.trustTransactions.trustAccountId, trustAccountId),
          eq(schema.trustTransactions.clientId, ledger.clientId),
          ledger.matterId
            ? eq(schema.trustTransactions.matterId, ledger.matterId)
            : sql`${schema.trustTransactions.matterId} IS NULL`,
          eq(schema.trustTransactions.transactionType, 'DEPOSIT')
        )
      )
      .orderBy(asc(schema.trustTransactions.transactionDate))
      .limit(1)

    // Get client name
    const [clientPerson] = await db
      .select({
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
        fullName: schema.people.fullName
      })
      .from(schema.clients)
      .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
      .where(eq(schema.clients.id, ledger.clientId))

    // Get matter title if applicable
    let matterTitle: string | null = null
    if (ledger.matterId) {
      const [matter] = await db
        .select({ title: schema.matters.title })
        .from(schema.matters)
        .where(eq(schema.matters.id, ledger.matterId))
      matterTitle = matter?.title ?? null
    }

    const clientName = clientPerson?.fullName ||
      `${clientPerson?.firstName || ''} ${clientPerson?.lastName || ''}`.trim() ||
      'Unknown Client'

    // Calculate aging bucket for this balance
    const depositDate = oldestDeposit?.transactionDate
    const aging: AgingBucket = {
      current: 0,
      days30to60: 0,
      days60to90: 0,
      over90: 0,
      total: ledger.balance
    }

    if (!depositDate || depositDate >= thirtyDaysAgo) {
      aging.current = ledger.balance
      totals.current += ledger.balance
    } else if (depositDate >= sixtyDaysAgo) {
      aging.days30to60 = ledger.balance
      totals.days30to60 += ledger.balance
    } else if (depositDate >= ninetyDaysAgo) {
      aging.days60to90 = ledger.balance
      totals.days60to90 += ledger.balance
    } else {
      aging.over90 = ledger.balance
      totals.over90 += ledger.balance
    }

    totals.total += ledger.balance

    clients.push({
      clientId: ledger.clientId,
      clientName,
      matterId: ledger.matterId,
      matterTitle,
      aging,
      oldestDeposit: depositDate ?? null
    })
  }

  // Sort by oldest deposit (over90 first)
  clients.sort((a, b) => {
    if (!a.oldestDeposit) return 1
    if (!b.oldestDeposit) return -1
    return a.oldestDeposit.getTime() - b.oldestDeposit.getTime()
  })

  return {
    trustAccountId,
    asOf: now,
    totals,
    clients
  }
}

/**
 * Generate a client trust ledger statement for a period
 *
 * @param trustAccountId The trust account ID
 * @param clientId The client ID
 * @param periodStart Start of period
 * @param periodEnd End of period
 * @param matterId Optional matter ID filter
 * @returns Client ledger statement
 */
export async function generateClientLedgerStatement(
  trustAccountId: string,
  clientId: string,
  periodStart: Date,
  periodEnd: Date,
  matterId?: string | null
): Promise<ClientLedgerStatement> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // Get trust account name
  const [account] = await db
    .select({ accountName: schema.trustAccounts.accountName })
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.id, trustAccountId))

  // Get client name
  const [clientPerson] = await db
    .select({
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName
    })
    .from(schema.clients)
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .where(eq(schema.clients.id, clientId))

  const clientName = clientPerson?.fullName ||
    `${clientPerson?.firstName || ''} ${clientPerson?.lastName || ''}`.trim() ||
    'Unknown Client'

  // Get matter title if applicable
  let matterTitle: string | null = null
  if (matterId) {
    const [matter] = await db
      .select({ title: schema.matters.title })
      .from(schema.matters)
      .where(eq(schema.matters.id, matterId))
    matterTitle = matter?.title ?? null
  }

  // Build conditions for transactions
  const conditions = [
    eq(schema.trustTransactions.trustAccountId, trustAccountId),
    eq(schema.trustTransactions.clientId, clientId)
  ]

  if (matterId !== undefined) {
    if (matterId) {
      conditions.push(eq(schema.trustTransactions.matterId, matterId))
    } else {
      conditions.push(sql`${schema.trustTransactions.matterId} IS NULL`)
    }
  }

  // Get opening balance (sum of all transactions before period start)
  const [openingResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${schema.trustTransactions.amount}), 0)`
    })
    .from(schema.trustTransactions)
    .where(
      and(
        ...conditions,
        lt(schema.trustTransactions.transactionDate, periodStart)
      )
    )

  const openingBalance = openingResult?.total ?? 0

  // Get transactions within period
  const transactions = await db
    .select({
      id: schema.trustTransactions.id,
      transactionDate: schema.trustTransactions.transactionDate,
      transactionType: schema.trustTransactions.transactionType,
      description: schema.trustTransactions.description,
      amount: schema.trustTransactions.amount,
      runningBalance: schema.trustTransactions.runningBalance,
      referenceNumber: schema.trustTransactions.referenceNumber,
      checkNumber: schema.trustTransactions.checkNumber
    })
    .from(schema.trustTransactions)
    .where(
      and(
        ...conditions,
        gte(schema.trustTransactions.transactionDate, periodStart),
        lt(schema.trustTransactions.transactionDate, periodEnd)
      )
    )
    .orderBy(asc(schema.trustTransactions.transactionDate))

  // Calculate totals and format entries
  let totalDeposits = 0
  let totalDisbursements = 0
  const entries: LedgerEntry[] = []

  for (const tx of transactions) {
    const isDeposit = tx.amount > 0

    if (isDeposit) {
      totalDeposits += tx.amount
    } else {
      totalDisbursements += Math.abs(tx.amount)
    }

    entries.push({
      id: tx.id,
      transactionDate: tx.transactionDate,
      transactionType: tx.transactionType,
      description: tx.description,
      deposit: isDeposit ? tx.amount : null,
      disbursement: !isDeposit ? Math.abs(tx.amount) : null,
      runningBalance: tx.runningBalance,
      referenceNumber: tx.referenceNumber,
      checkNumber: tx.checkNumber
    })
  }

  const closingBalance = openingBalance + totalDeposits - totalDisbursements

  return {
    clientId,
    clientName,
    matterId: matterId ?? null,
    matterTitle,
    trustAccountId,
    trustAccountName: account?.accountName ?? 'Trust Account',
    periodStart,
    periodEnd,
    openingBalance,
    totalDeposits,
    totalDisbursements,
    closingBalance,
    entries
  }
}
