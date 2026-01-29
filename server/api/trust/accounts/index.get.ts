import { eq } from 'drizzle-orm'

/**
 * GET /api/trust/accounts
 *
 * List all trust accounts.
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  const accounts = await db
    .select({
      id: schema.trustAccounts.id,
      accountName: schema.trustAccounts.accountName,
      accountType: schema.trustAccounts.accountType,
      bankName: schema.trustAccounts.bankName,
      accountNumberLast4: schema.trustAccounts.accountNumberLast4,
      currentBalance: schema.trustAccounts.currentBalance,
      isActive: schema.trustAccounts.isActive,
      createdAt: schema.trustAccounts.createdAt,
      updatedAt: schema.trustAccounts.updatedAt
    })
    .from(schema.trustAccounts)
    .orderBy(schema.trustAccounts.accountName)

  return {
    accounts: accounts.map(a => ({
      ...a,
      // Snake case for backward compatibility
      account_name: a.accountName,
      account_type: a.accountType,
      bank_name: a.bankName,
      account_number_last4: a.accountNumberLast4,
      current_balance: a.currentBalance,
      is_active: a.isActive ? 1 : 0,
      created_at: a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt,
      updated_at: a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt
    }))
  }
})
