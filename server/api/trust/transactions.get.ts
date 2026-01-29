import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'

/**
 * GET /api/trust/transactions
 *
 * List trust transactions with optional filters.
 * Query params: clientId, matterId, transactionType, startDate, endDate, page, limit
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const clientId = query.clientId as string | undefined
  const matterId = query.matterId as string | undefined
  const transactionType = query.transactionType as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = (page - 1) * limit

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Build conditions
  const conditions: any[] = []

  if (clientId) {
    conditions.push(eq(schema.trustTransactions.clientId, clientId))
  }

  if (matterId) {
    conditions.push(eq(schema.trustTransactions.matterId, matterId))
  }

  if (transactionType) {
    conditions.push(eq(schema.trustTransactions.transactionType, transactionType as any))
  }

  if (startDate) {
    conditions.push(gte(schema.trustTransactions.transactionDate, new Date(startDate)))
  }

  if (endDate) {
    conditions.push(lte(schema.trustTransactions.transactionDate, new Date(endDate)))
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.trustTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const totalCount = countResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Get transactions with related data
  const transactions = await db
    .select({
      id: schema.trustTransactions.id,
      trustAccountId: schema.trustTransactions.trustAccountId,
      clientId: schema.trustTransactions.clientId,
      matterId: schema.trustTransactions.matterId,
      transactionType: schema.trustTransactions.transactionType,
      amount: schema.trustTransactions.amount,
      runningBalance: schema.trustTransactions.runningBalance,
      description: schema.trustTransactions.description,
      referenceNumber: schema.trustTransactions.referenceNumber,
      checkNumber: schema.trustTransactions.checkNumber,
      invoiceId: schema.trustTransactions.invoiceId,
      paymentId: schema.trustTransactions.paymentId,
      transactionDate: schema.trustTransactions.transactionDate,
      clearedDate: schema.trustTransactions.clearedDate,
      createdBy: schema.trustTransactions.createdBy,
      createdAt: schema.trustTransactions.createdAt
    })
    .from(schema.trustTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.trustTransactions.transactionDate))
    .limit(limit)
    .offset(offset)

  // Fetch client names for display
  const clientIds = [...new Set(transactions.map(t => t.clientId))]
  const clientNames: Record<string, string> = {}

  if (clientIds.length > 0) {
    const clients = await db
      .select({
        id: schema.clients.id,
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
        fullName: schema.people.fullName
      })
      .from(schema.clients)
      .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
      .where(sql`${schema.clients.id} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`)

    for (const c of clients) {
      clientNames[c.id] = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
    }
  }

  return {
    transactions: transactions.map(t => ({
      ...t,
      clientName: clientNames[t.clientId] || 'Unknown',
      // Snake case for backward compatibility
      trust_account_id: t.trustAccountId,
      client_id: t.clientId,
      matter_id: t.matterId,
      transaction_type: t.transactionType,
      running_balance: t.runningBalance,
      reference_number: t.referenceNumber,
      check_number: t.checkNumber,
      invoice_id: t.invoiceId,
      payment_id: t.paymentId,
      transaction_date: t.transactionDate instanceof Date ? t.transactionDate.getTime() : t.transactionDate,
      cleared_date: t.clearedDate instanceof Date ? t.clearedDate.getTime() : t.clearedDate,
      created_by: t.createdBy,
      created_at: t.createdAt instanceof Date ? t.createdAt.getTime() : t.createdAt
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
})
