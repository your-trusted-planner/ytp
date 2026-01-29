import { eq, and, desc, sql, inArray } from 'drizzle-orm'

/**
 * GET /api/invoices
 *
 * List all invoices with optional filters.
 * Query params: clientId, matterId, status, page, limit
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
  const status = query.status as string | undefined
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 25, 100)
  const offset = (page - 1) * limit

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Build conditions
  const conditions: any[] = []

  if (clientId) {
    conditions.push(eq(schema.invoices.clientId, clientId))
  }

  if (matterId) {
    conditions.push(eq(schema.invoices.matterId, matterId))
  }

  if (status) {
    if (status === 'outstanding') {
      // Outstanding = SENT, VIEWED, PARTIALLY_PAID, OVERDUE
      conditions.push(inArray(schema.invoices.status, ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE']))
    } else {
      conditions.push(eq(schema.invoices.status, status as any))
    }
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const totalCount = countResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Get invoices with client info
  const invoices = await db
    .select({
      id: schema.invoices.id,
      matterId: schema.invoices.matterId,
      clientId: schema.invoices.clientId,
      invoiceNumber: schema.invoices.invoiceNumber,
      status: schema.invoices.status,
      subtotal: schema.invoices.subtotal,
      taxRate: schema.invoices.taxRate,
      taxAmount: schema.invoices.taxAmount,
      discountAmount: schema.invoices.discountAmount,
      totalAmount: schema.invoices.totalAmount,
      trustApplied: schema.invoices.trustApplied,
      directPayments: schema.invoices.directPayments,
      balanceDue: schema.invoices.balanceDue,
      issueDate: schema.invoices.issueDate,
      dueDate: schema.invoices.dueDate,
      sentAt: schema.invoices.sentAt,
      paidAt: schema.invoices.paidAt,
      notes: schema.invoices.notes,
      createdBy: schema.invoices.createdBy,
      createdAt: schema.invoices.createdAt,
      updatedAt: schema.invoices.updatedAt,
      // Client info
      clientFirstName: schema.people.firstName,
      clientLastName: schema.people.lastName,
      clientFullName: schema.people.fullName,
      clientEmail: schema.people.email,
      // Matter info
      matterTitle: schema.matters.title
    })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.invoices.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    invoices: invoices.map(inv => ({
      ...inv,
      clientName: inv.clientFullName || `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() || 'Unknown',
      // Snake case for backward compatibility
      matter_id: inv.matterId,
      client_id: inv.clientId,
      invoice_number: inv.invoiceNumber,
      tax_rate: inv.taxRate,
      tax_amount: inv.taxAmount,
      discount_amount: inv.discountAmount,
      total_amount: inv.totalAmount,
      trust_applied: inv.trustApplied,
      direct_payments: inv.directPayments,
      balance_due: inv.balanceDue,
      issue_date: inv.issueDate instanceof Date ? inv.issueDate.getTime() : inv.issueDate,
      due_date: inv.dueDate instanceof Date ? inv.dueDate.getTime() : inv.dueDate,
      sent_at: inv.sentAt instanceof Date ? inv.sentAt.getTime() : inv.sentAt,
      paid_at: inv.paidAt instanceof Date ? inv.paidAt.getTime() : inv.paidAt,
      created_by: inv.createdBy,
      created_at: inv.createdAt instanceof Date ? inv.createdAt.getTime() : inv.createdAt,
      updated_at: inv.updatedAt instanceof Date ? inv.updatedAt.getTime() : inv.updatedAt,
      client_name: inv.clientFullName || `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() || 'Unknown',
      client_email: inv.clientEmail,
      matter_title: inv.matterTitle
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
