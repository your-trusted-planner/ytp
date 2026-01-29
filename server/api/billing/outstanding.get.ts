import { eq, and, desc, or, sql } from 'drizzle-orm'

/**
 * GET /api/billing/outstanding
 *
 * Get all outstanding (unpaid) invoices.
 * Includes SENT, VIEWED, and PARTIALLY_PAID invoices.
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 25, 100)
  const offset = (page - 1) * limit

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const outstandingStatuses = ['SENT', 'VIEWED', 'PARTIALLY_PAID']

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.invoices)
    .where(
      or(
        eq(schema.invoices.status, 'SENT'),
        eq(schema.invoices.status, 'VIEWED'),
        eq(schema.invoices.status, 'PARTIALLY_PAID')
      )
    )

  const totalCount = countResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Get outstanding invoices
  const invoices = await db
    .select({
      id: schema.invoices.id,
      invoiceNumber: schema.invoices.invoiceNumber,
      clientId: schema.invoices.clientId,
      matterId: schema.invoices.matterId,
      status: schema.invoices.status,
      totalAmount: schema.invoices.totalAmount,
      balanceDue: schema.invoices.balanceDue,
      issueDate: schema.invoices.issueDate,
      dueDate: schema.invoices.dueDate,
      sentAt: schema.invoices.sentAt,
      // Client info
      clientFirstName: schema.people.firstName,
      clientLastName: schema.people.lastName,
      clientFullName: schema.people.fullName,
      // Matter info
      matterTitle: schema.matters.title
    })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
    .where(
      or(
        eq(schema.invoices.status, 'SENT'),
        eq(schema.invoices.status, 'VIEWED'),
        eq(schema.invoices.status, 'PARTIALLY_PAID')
      )
    )
    .orderBy(desc(schema.invoices.balanceDue))
    .limit(limit)
    .offset(offset)

  // Calculate totals
  const [totalsResult] = await db
    .select({
      totalBalance: sql<number>`COALESCE(SUM(${schema.invoices.balanceDue}), 0)`
    })
    .from(schema.invoices)
    .where(
      or(
        eq(schema.invoices.status, 'SENT'),
        eq(schema.invoices.status, 'VIEWED'),
        eq(schema.invoices.status, 'PARTIALLY_PAID')
      )
    )

  const now = new Date()

  return {
    invoices: invoices.map(inv => {
      const clientName = inv.clientFullName ||
        `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() ||
        'Unknown'
      const isOverdue = inv.dueDate && new Date(inv.dueDate) < now

      return {
        ...inv,
        clientName,
        isOverdue,
        daysPastDue: isOverdue && inv.dueDate
          ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (24 * 60 * 60 * 1000))
          : 0,
        // Snake case
        invoice_number: inv.invoiceNumber,
        client_id: inv.clientId,
        matter_id: inv.matterId,
        total_amount: inv.totalAmount,
        balance_due: inv.balanceDue,
        issue_date: inv.issueDate instanceof Date ? inv.issueDate.getTime() : inv.issueDate,
        due_date: inv.dueDate instanceof Date ? inv.dueDate.getTime() : inv.dueDate,
        sent_at: inv.sentAt instanceof Date ? inv.sentAt.getTime() : inv.sentAt,
        client_name: clientName,
        matter_title: inv.matterTitle,
        is_overdue: isOverdue
      }
    }),
    totals: {
      count: totalCount,
      balanceDue: totalsResult?.totalBalance ?? 0,
      balanceDueFormatted: formatCurrency(totalsResult?.totalBalance ?? 0)
    },
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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}
