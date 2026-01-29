import { eq, and, sql, gte, lt } from 'drizzle-orm'
import { getActiveTrustAccount, sumClientBalances } from '../../utils/trust-ledger'

/**
 * GET /api/billing/summary
 *
 * Get billing dashboard summary statistics.
 * Includes: invoices outstanding, overdue, trust balance, recent activity.
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const now = new Date()

  // Invoice statistics
  const [invoiceStats] = await db
    .select({
      totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${schema.invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID') THEN ${schema.invoices.balanceDue} ELSE 0 END), 0)`,
      totalOverdue: sql<number>`COALESCE(SUM(CASE WHEN ${schema.invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE') AND ${schema.invoices.dueDate} < ${now.getTime()} THEN ${schema.invoices.balanceDue} ELSE 0 END), 0)`,
      countOutstanding: sql<number>`COUNT(CASE WHEN ${schema.invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID') THEN 1 END)`,
      countOverdue: sql<number>`COUNT(CASE WHEN ${schema.invoices.status} IN ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE') AND ${schema.invoices.dueDate} < ${now.getTime()} THEN 1 END)`,
      countDraft: sql<number>`COUNT(CASE WHEN ${schema.invoices.status} = 'DRAFT' THEN 1 END)`,
      countPaidThisMonth: sql<number>`COUNT(CASE WHEN ${schema.invoices.status} = 'PAID' AND ${schema.invoices.paidAt} >= ${new Date(now.getFullYear(), now.getMonth(), 1).getTime()} THEN 1 END)`,
      amountCollectedThisMonth: sql<number>`COALESCE(SUM(CASE WHEN ${schema.invoices.status} = 'PAID' AND ${schema.invoices.paidAt} >= ${new Date(now.getFullYear(), now.getMonth(), 1).getTime()} THEN ${schema.invoices.totalAmount} ELSE 0 END), 0)`
    })
    .from(schema.invoices)

  // Trust account balance
  const trustAccount = await getActiveTrustAccount()
  let trustBalance = 0
  let clientBalancesSum = 0

  if (trustAccount) {
    trustBalance = trustAccount.currentBalance
    clientBalancesSum = await sumClientBalances(trustAccount.id)
  }

  // Count clients with trust balances
  let clientsWithTrustBalance = 0
  if (trustAccount) {
    const [trustClientCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.clientTrustLedgers.clientId})`
      })
      .from(schema.clientTrustLedgers)
      .where(and(
        eq(schema.clientTrustLedgers.trustAccountId, trustAccount.id),
        sql`${schema.clientTrustLedgers.balance} > 0`
      ))
    clientsWithTrustBalance = trustClientCount?.count ?? 0
  }

  // Recent payments (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const [recentPaymentStats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)`
    })
    .from(schema.payments)
    .where(and(
      eq(schema.payments.status, 'COMPLETED'),
      gte(schema.payments.paidAt, thirtyDaysAgo)
    ))

  return {
    summary: {
      invoices: {
        outstanding: {
          count: invoiceStats?.countOutstanding ?? 0,
          amount: invoiceStats?.totalOutstanding ?? 0,
          amountFormatted: formatCurrency(invoiceStats?.totalOutstanding ?? 0)
        },
        overdue: {
          count: invoiceStats?.countOverdue ?? 0,
          amount: invoiceStats?.totalOverdue ?? 0,
          amountFormatted: formatCurrency(invoiceStats?.totalOverdue ?? 0)
        },
        draft: {
          count: invoiceStats?.countDraft ?? 0
        },
        paidThisMonth: {
          count: invoiceStats?.countPaidThisMonth ?? 0,
          amount: invoiceStats?.amountCollectedThisMonth ?? 0,
          amountFormatted: formatCurrency(invoiceStats?.amountCollectedThisMonth ?? 0)
        }
      },
      trust: {
        hasAccount: !!trustAccount,
        accountName: trustAccount?.accountName ?? null,
        balance: trustBalance,
        balanceFormatted: formatCurrency(trustBalance),
        clientBalancesSum,
        isBalanced: trustBalance === clientBalancesSum,
        clientsWithBalance: clientsWithTrustBalance
      },
      recentPayments: {
        count: recentPaymentStats?.count ?? 0,
        amount: recentPaymentStats?.total ?? 0,
        amountFormatted: formatCurrency(recentPaymentStats?.total ?? 0),
        period: '30 days'
      }
    },
    // Snake case
    invoices_outstanding: invoiceStats?.totalOutstanding ?? 0,
    invoices_overdue: invoiceStats?.totalOverdue ?? 0,
    trust_balance: trustBalance,
    generated_at: now.toISOString()
  }
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}
