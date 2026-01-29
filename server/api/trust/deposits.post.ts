import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import {
  getActiveTrustAccount,
  updateLedgerBalance,
  updateTrustAccountBalance,
  getClientTrustBalance
} from '../../utils/trust-ledger'

const depositSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  matterId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  transactionDate: z.string().datetime().optional() // ISO datetime, defaults to now
})

/**
 * POST /api/trust/deposits
 *
 * Record a deposit to the client's trust account.
 * Requires: LAWYER, ADMIN, or STAFF role
 *
 * Flow:
 * 1. Validate client exists
 * 2. Create trust transaction (DEPOSIT)
 * 3. Update client trust ledger balance (+)
 * 4. Update trust account total balance (+)
 * 5. Log activity
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = depositSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get the active trust account
  const trustAccount = await getActiveTrustAccount()
  if (!trustAccount) {
    throw createError({
      statusCode: 400,
      message: 'No active trust account configured. Please create a trust account first.'
    })
  }

  // Verify client exists
  const [client] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.id, parsed.data.clientId))

  if (!client) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  // If matter specified, verify it exists
  if (parsed.data.matterId) {
    const [matter] = await db
      .select({ id: schema.matters.id })
      .from(schema.matters)
      .where(eq(schema.matters.id, parsed.data.matterId))

    if (!matter) {
      throw createError({ statusCode: 404, message: 'Matter not found' })
    }
  }

  const transactionId = crypto.randomUUID()
  const transactionDate = parsed.data.transactionDate
    ? new Date(parsed.data.transactionDate)
    : new Date()

  // Get current balance before deposit (for running balance calculation)
  const currentBalance = await getClientTrustBalance(
    parsed.data.clientId,
    parsed.data.matterId
  )
  const newBalance = currentBalance + parsed.data.amount

  // Create trust transaction
  await db.insert(schema.trustTransactions).values({
    id: transactionId,
    trustAccountId: trustAccount.id,
    clientId: parsed.data.clientId,
    matterId: parsed.data.matterId ?? null,
    transactionType: 'DEPOSIT',
    amount: parsed.data.amount, // Positive for deposits
    runningBalance: newBalance,
    description: parsed.data.description,
    referenceNumber: parsed.data.referenceNumber ?? null,
    checkNumber: parsed.data.checkNumber ?? null,
    transactionDate,
    createdBy: user.id
  })

  // Update client trust ledger balance
  await updateLedgerBalance(
    trustAccount.id,
    parsed.data.clientId,
    parsed.data.matterId ?? null,
    parsed.data.amount
  )

  // Update trust account total balance
  await updateTrustAccountBalance(trustAccount.id, parsed.data.amount)

  // Get client name for logging
  const clientName = await resolveEntityName('client', parsed.data.clientId)

  // Log activity
  await logActivity({
    type: 'TRUST_DEPOSIT_RECEIVED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: parsed.data.clientId, name: clientName || 'Unknown Client' },
    relatedEntities: parsed.data.matterId
      ? [{ type: 'matter', id: parsed.data.matterId, name: await resolveEntityName('matter', parsed.data.matterId) || 'Unknown Matter' }]
      : [],
    event,
    details: {
      amount: parsed.data.amount,
      description: parsed.data.description,
      referenceNumber: parsed.data.referenceNumber,
      newBalance
    }
  })

  return {
    success: true,
    transaction: {
      id: transactionId,
      transactionType: 'DEPOSIT',
      amount: parsed.data.amount,
      runningBalance: newBalance,
      description: parsed.data.description,
      transactionDate: transactionDate.toISOString()
    },
    newBalance
  }
})
