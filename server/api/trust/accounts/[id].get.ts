import { eq } from 'drizzle-orm'

/**
 * GET /api/trust/accounts/:id
 *
 * Get details of a specific trust account.
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const accountId = getRouterParam(event, 'id')
  if (!accountId) {
    throw createError({ statusCode: 400, message: 'Account ID is required' })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  const [account] = await db
    .select()
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.id, accountId))

  if (!account) {
    throw createError({ statusCode: 404, message: 'Trust account not found' })
  }

  return {
    account: {
      ...account,
      account_name: account.accountName,
      account_type: account.accountType,
      bank_name: account.bankName,
      account_number_last4: account.accountNumberLast4,
      routing_number: account.routingNumber,
      current_balance: account.currentBalance,
      is_active: account.isActive ? 1 : 0,
      created_at: account.createdAt instanceof Date ? account.createdAt.getTime() : account.createdAt,
      updated_at: account.updatedAt instanceof Date ? account.updatedAt.getTime() : account.updatedAt
    }
  }
})
