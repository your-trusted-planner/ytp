import { generateAgingReport } from '../../utils/trust-reports'
import { getActiveTrustAccount } from '../../utils/trust-ledger'

/**
 * GET /api/trust/aging
 *
 * Generate a trust balance aging report.
 * Shows how long client funds have been held in trust.
 *
 * Aging buckets:
 * - Current: 0-30 days
 * - 30-60 days
 * - 60-90 days
 * - Over 90 days
 *
 * Note: Long-held trust funds may require review and possible refund.
 *
 * Requires: LAWYER or ADMIN role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Lawyer or Admin access required' })
  }

  // Get the active trust account
  const trustAccount = await getActiveTrustAccount()
  if (!trustAccount) {
    throw createError({
      statusCode: 400,
      message: 'No active trust account configured.'
    })
  }

  // Generate aging report
  const report = await generateAgingReport(trustAccount.id)

  return {
    report: {
      trustAccountId: report.trustAccountId,
      asOf: report.asOf.toISOString(),
      totals: {
        current: report.totals.current,
        days30to60: report.totals.days30to60,
        days60to90: report.totals.days60to90,
        over90: report.totals.over90,
        total: report.totals.total,
        // Snake case
        days_30_to_60: report.totals.days30to60,
        days_60_to_90: report.totals.days60to90,
        over_90: report.totals.over90
      },
      clients: report.clients.map(c => ({
        ...c,
        // Snake case
        client_id: c.clientId,
        client_name: c.clientName,
        matter_id: c.matterId,
        matter_title: c.matterTitle,
        oldest_deposit: c.oldestDeposit?.toISOString() || null,
        aging: {
          ...c.aging,
          days_30_to_60: c.aging.days30to60,
          days_60_to_90: c.aging.days60to90,
          over_90: c.aging.over90
        }
      })),
      // Snake case at top level
      trust_account_id: report.trustAccountId,
      as_of: report.asOf.toISOString()
    },
    // Summary for easy display
    summary: {
      totalClients: report.clients.length,
      totalBalance: formatCurrency(report.totals.total),
      buckets: {
        current: formatCurrency(report.totals.current),
        days30to60: formatCurrency(report.totals.days30to60),
        days60to90: formatCurrency(report.totals.days60to90),
        over90: formatCurrency(report.totals.over90)
      },
      alertCount: report.clients.filter(c => c.aging.over90 > 0).length // Clients with funds over 90 days
    }
  }
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}
