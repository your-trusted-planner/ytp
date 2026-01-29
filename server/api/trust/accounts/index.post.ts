import { z } from 'zod'
import { logActivity } from '../../../utils/activity-logger'

const createTrustAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['IOLTA', 'NON_IOLTA', 'ESCROW']).default('IOLTA'),
  bankName: z.string().optional(),
  accountNumberLast4: z.string().max(4).optional(),
  routingNumber: z.string().optional()
})

/**
 * POST /api/trust/accounts
 *
 * Create a new trust account.
 * Requires: ADMIN role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const parsed = createTrustAccountSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  const accountId = crypto.randomUUID()

  await db.insert(schema.trustAccounts).values({
    id: accountId,
    accountName: parsed.data.accountName,
    accountType: parsed.data.accountType,
    bankName: parsed.data.bankName,
    accountNumberLast4: parsed.data.accountNumberLast4,
    routingNumber: parsed.data.routingNumber,
    currentBalance: 0,
    isActive: true
  })

  // Log activity
  await logActivity({
    type: 'TRUST_ACCOUNT_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'setting', id: accountId, name: parsed.data.accountName },
    event,
    details: {
      accountType: parsed.data.accountType,
      bankName: parsed.data.bankName
    }
  })

  // Fetch the created account
  const [account] = await db
    .select()
    .from(schema.trustAccounts)
    .where(eq(schema.trustAccounts.id, accountId))

  return {
    success: true,
    account: {
      ...account,
      account_name: account.accountName,
      account_type: account.accountType,
      bank_name: account.bankName,
      account_number_last4: account.accountNumberLast4,
      current_balance: account.currentBalance,
      is_active: account.isActive ? 1 : 0
    }
  }
})

import { eq } from 'drizzle-orm'
