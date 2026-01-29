import { eq, and, desc, sql } from 'drizzle-orm'

/**
 * GET /api/payments
 *
 * List all payments with optional filters.
 * Query params: matterId, status, page, limit
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const matterId = query.matterId as string | undefined
  const status = query.status as string | undefined
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 25, 100)
  const offset = (page - 1) * limit

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Build conditions
  const conditions: any[] = []

  if (matterId) {
    conditions.push(eq(schema.payments.matterId, matterId))
  }

  if (status) {
    conditions.push(eq(schema.payments.status, status as any))
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.payments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const totalCount = countResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Get payments with matter and client info
  const payments = await db
    .select({
      id: schema.payments.id,
      matterId: schema.payments.matterId,
      paymentType: schema.payments.paymentType,
      amount: schema.payments.amount,
      paymentMethod: schema.payments.paymentMethod,
      status: schema.payments.status,
      fundSource: schema.payments.fundSource,
      invoiceId: schema.payments.invoiceId,
      checkNumber: schema.payments.checkNumber,
      referenceNumber: schema.payments.referenceNumber,
      paidAt: schema.payments.paidAt,
      notes: schema.payments.notes,
      recordedBy: schema.payments.recordedBy,
      createdAt: schema.payments.createdAt,
      updatedAt: schema.payments.updatedAt,
      // Matter info
      matterTitle: schema.matters.title,
      clientId: schema.matters.clientId
    })
    .from(schema.payments)
    .innerJoin(schema.matters, eq(schema.payments.matterId, schema.matters.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.payments.createdAt))
    .limit(limit)
    .offset(offset)

  // Get client names
  const clientIds = [...new Set(payments.map(p => p.clientId))]
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

    for (const c of clients) {
      if (clientIds.includes(c.id)) {
        clientNames[c.id] = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
      }
    }
  }

  return {
    payments: payments.map(p => ({
      ...p,
      clientName: clientNames[p.clientId] || 'Unknown',
      // Snake case
      matter_id: p.matterId,
      payment_type: p.paymentType,
      payment_method: p.paymentMethod,
      fund_source: p.fundSource,
      invoice_id: p.invoiceId,
      check_number: p.checkNumber,
      reference_number: p.referenceNumber,
      paid_at: p.paidAt instanceof Date ? p.paidAt.getTime() : p.paidAt,
      recorded_by: p.recordedBy,
      created_at: p.createdAt instanceof Date ? p.createdAt.getTime() : p.createdAt,
      updated_at: p.updatedAt instanceof Date ? p.updatedAt.getTime() : p.updatedAt,
      matter_title: p.matterTitle,
      client_id: p.clientId,
      client_name: clientNames[p.clientId] || 'Unknown'
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
