import { eq, and, desc, or, lt, sql } from 'drizzle-orm'

/**
 * GET /api/billing/overdue
 *
 * Get all overdue invoices (past due date and not paid).
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

  const now = new Date()

  // Overdue = sent/viewed/partially_paid + past due date
  const overdueCondition = and(
    or(
      eq(schema.invoices.status, 'SENT'),
      eq(schema.invoices.status, 'VIEWED'),
      eq(schema.invoices.status, 'PARTIALLY_PAID'),
      eq(schema.invoices.status, 'OVERDUE')
    ),
    lt(schema.invoices.dueDate, now)
  )

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.invoices)
    .where(overdueCondition)

  const totalCount = countResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Get overdue invoices
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
      clientEmail: schema.people.email,
      // Matter info
      matterTitle: schema.matters.title
    })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
    .where(overdueCondition)
    .orderBy(schema.invoices.dueDate) // Oldest overdue first
    .limit(limit)
    .offset(offset)

  // Calculate totals
  const [totalsResult] = await db
    .select({
      totalBalance: sql<number>`COALESCE(SUM(${schema.invoices.balanceDue}), 0)`
    })
    .from(schema.invoices)
    .where(overdueCondition)

  // Also update status to OVERDUE if not already
  const invoiceIds = invoices
    .filter(inv => inv.status !== 'OVERDUE')
    .map(inv => inv.id)

  if (invoiceIds.length > 0) {
    // Update in background - don't block the response
    for (const id of invoiceIds) {
      db.update(schema.invoices)
        .set({ status: 'OVERDUE', updatedAt: new Date() })
        .where(eq(schema.invoices.id, id))
        .catch(() => {}) // Ignore errors
    }
  }

  return {
    invoices: invoices.map(inv => {
      const clientName = inv.clientFullName ||
        `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() ||
        'Unknown'
      const daysPastDue = inv.dueDate
        ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (24 * 60 * 60 * 1000))
        : 0

      return {
        ...inv,
        clientName,
        daysPastDue,
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
        client_email: inv.clientEmail,
        matter_title: inv.matterTitle,
        days_past_due: daysPastDue
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
