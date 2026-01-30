import { eq, and, gte, lte, asc } from 'drizzle-orm'
import { generateClientLedgerStatement } from '../../../../utils/trust-reports'
import { getActiveTrustAccount } from '../../../../utils/trust-ledger'

/**
 * GET /api/trust/clients/:clientId/ledger
 *
 * Get a client's trust ledger statement.
 * Query params: matterId, startDate, endDate
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Client ID is required' })
  }

  const query = getQuery(event)
  const matterId = query.matterId as string | undefined
  const startDateStr = query.startDate as string | undefined
  const endDateStr = query.endDate as string | undefined

  const { useDrizzle, schema } = await import('../../../../db')
  const db = useDrizzle()

  // Try to find client by ID in clients table first
  let [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))

  // If not found, check if clientId is actually a user ID and lookup via personId
  if (!client) {
    const [userWithClient] = await db
      .select({ clientId: schema.clients.id })
      .from(schema.users)
      .innerJoin(schema.people, eq(schema.users.personId, schema.people.id))
      .innerJoin(schema.clients, eq(schema.clients.personId, schema.people.id))
      .where(eq(schema.users.id, clientId))

    if (userWithClient) {
      client = { id: userWithClient.clientId }
    }
  }

  if (!client) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  // Use the resolved client ID for all subsequent operations
  const resolvedClientId = client.id

  // Get the active trust account
  const trustAccount = await getActiveTrustAccount()
  if (!trustAccount) {
    throw createError({
      statusCode: 400,
      message: 'No active trust account configured.'
    })
  }

  // Default date range: last 12 months
  const now = new Date()
  const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const periodStart = startDateStr ? new Date(startDateStr) : defaultStart
  const periodEnd = endDateStr ? new Date(endDateStr) : now

  // Generate the ledger statement
  const statement = await generateClientLedgerStatement(
    trustAccount.id,
    resolvedClientId,
    periodStart,
    periodEnd,
    matterId
  )

  return {
    statement: {
      ...statement,
      // Snake case for backward compatibility
      client_id: statement.clientId,
      client_name: statement.clientName,
      matter_id: statement.matterId,
      matter_title: statement.matterTitle,
      trust_account_id: statement.trustAccountId,
      trust_account_name: statement.trustAccountName,
      period_start: statement.periodStart.toISOString(),
      period_end: statement.periodEnd.toISOString(),
      opening_balance: statement.openingBalance,
      total_deposits: statement.totalDeposits,
      total_disbursements: statement.totalDisbursements,
      closing_balance: statement.closingBalance,
      entries: statement.entries.map(e => ({
        ...e,
        transaction_date: e.transactionDate instanceof Date ? e.transactionDate.getTime() : e.transactionDate,
        transaction_type: e.transactionType,
        running_balance: e.runningBalance,
        reference_number: e.referenceNumber,
        check_number: e.checkNumber
      }))
    }
  }
})
