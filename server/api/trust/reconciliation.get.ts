import { generateReconciliation } from '../../utils/trust-reports'
import { getActiveTrustAccount } from '../../utils/trust-ledger'

/**
 * GET /api/trust/reconciliation
 *
 * Generate a three-way reconciliation report.
 * Query params: bankBalance (required - manual entry of bank statement balance)
 *
 * Three-way reconciliation compares:
 * 1. Bank balance (per statement)
 * 2. Trust ledger balance (our tracking)
 * 3. Sum of all client balances
 *
 * All three should match if records are accurate.
 *
 * Requires: LAWYER or ADMIN role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Lawyer or Admin access required' })
  }

  const query = getQuery(event)
  const bankBalanceStr = query.bankBalance as string | undefined

  if (!bankBalanceStr) {
    throw createError({
      statusCode: 400,
      message: 'Bank balance is required (in cents). Example: ?bankBalance=125432'
    })
  }

  const bankBalance = parseInt(bankBalanceStr, 10)
  if (isNaN(bankBalance)) {
    throw createError({
      statusCode: 400,
      message: 'Bank balance must be a valid integer (in cents)'
    })
  }

  // Get the active trust account
  const trustAccount = await getActiveTrustAccount()
  if (!trustAccount) {
    throw createError({
      statusCode: 400,
      message: 'No active trust account configured.'
    })
  }

  // Generate reconciliation report
  const report = await generateReconciliation(trustAccount.id, bankBalance)

  return {
    reconciliation: {
      ...report,
      // Snake case for backward compatibility
      trust_account_id: report.trustAccountId,
      account_name: report.accountName,
      as_of: report.asOf.toISOString(),
      bank_balance: report.bankBalance,
      trust_ledger_balance: report.trustLedgerBalance,
      sum_client_balances: report.sumClientBalances,
      is_balanced: report.isBalanced,
      client_count: report.clientCount
    },
    // Summary for easy display
    summary: {
      bankBalance: formatCurrency(report.bankBalance),
      trustLedgerBalance: formatCurrency(report.trustLedgerBalance),
      sumClientBalances: formatCurrency(report.sumClientBalances),
      variance: formatCurrency(report.variance),
      isBalanced: report.isBalanced,
      status: report.isBalanced ? 'BALANCED' : 'OUT_OF_BALANCE'
    }
  }
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}
