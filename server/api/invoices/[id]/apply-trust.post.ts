import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'
import {
  getActiveTrustAccount,
  validateDisbursement,
  updateLedgerBalance,
  updateTrustAccountBalance,
  getClientTrustBalance
} from '../../../utils/trust-ledger'

const applyTrustSchema = z.object({
  amount: z.number().int().positive('Amount must be positive (in cents)').optional(),
  applyFull: z.boolean().default(false) // If true, apply entire available balance
})

/**
 * POST /api/invoices/:id/apply-trust
 *
 * Apply trust funds to an invoice.
 * Creates a disbursement transaction from trust.
 *
 * Options:
 * - amount: Specific amount to apply (in cents)
 * - applyFull: true to apply entire available balance
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const invoiceId = getRouterParam(event, 'id')
  if (!invoiceId) {
    throw createError({ statusCode: 400, message: 'Invoice ID is required' })
  }

  const body = await readBody(event)
  const parsed = applyTrustSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  if (!parsed.data.amount && !parsed.data.applyFull) {
    throw createError({
      statusCode: 400,
      message: 'Either amount or applyFull must be specified'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get invoice
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' })
  }

  // Cannot apply trust to voided/cancelled invoices
  if (['VOID', 'CANCELLED'].includes(invoice.status)) {
    throw createError({
      statusCode: 400,
      message: `Cannot apply trust to ${invoice.status} invoice`
    })
  }

  // Check if there's a balance due
  if (invoice.balanceDue <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Invoice is already fully paid'
    })
  }

  // Get trust account
  const trustAccount = await getActiveTrustAccount()
  if (!trustAccount) {
    throw createError({
      statusCode: 400,
      message: 'No active trust account configured'
    })
  }

  // Get client's available trust balance
  const availableBalance = await getClientTrustBalance(invoice.clientId, invoice.matterId)

  if (availableBalance <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Client has no funds in trust'
    })
  }

  // Calculate amount to apply
  let applyAmount: number

  if (parsed.data.applyFull) {
    // Apply up to the balance due or available balance, whichever is less
    applyAmount = Math.min(availableBalance, invoice.balanceDue)
  } else {
    applyAmount = parsed.data.amount!

    // Don't apply more than needed
    if (applyAmount > invoice.balanceDue) {
      applyAmount = invoice.balanceDue
    }

    // Validate sufficient balance
    if (applyAmount > availableBalance) {
      throw createError({
        statusCode: 400,
        message: `Insufficient trust balance. Available: $${(availableBalance / 100).toFixed(2)}, Requested: $${(applyAmount / 100).toFixed(2)}`
      })
    }
  }

  // Create disbursement transaction
  const transactionId = crypto.randomUUID()
  const transactionDate = new Date()
  const newTrustBalance = availableBalance - applyAmount

  await db.insert(schema.trustTransactions).values({
    id: transactionId,
    trustAccountId: trustAccount.id,
    clientId: invoice.clientId,
    matterId: invoice.matterId,
    transactionType: 'DISBURSEMENT',
    amount: -applyAmount, // Negative for disbursement
    runningBalance: newTrustBalance,
    description: `Payment applied to Invoice ${invoice.invoiceNumber}`,
    invoiceId,
    transactionDate,
    createdBy: user.id
  })

  // Update ledger balance
  await updateLedgerBalance(
    trustAccount.id,
    invoice.clientId,
    invoice.matterId,
    -applyAmount
  )

  // Update trust account total
  await updateTrustAccountBalance(trustAccount.id, -applyAmount)

  // Update invoice
  const newTrustApplied = invoice.trustApplied + applyAmount
  const newBalanceDue = invoice.totalAmount - newTrustApplied - invoice.directPayments
  const newStatus = newBalanceDue <= 0 ? 'PAID' :
    (newTrustApplied > 0 || invoice.directPayments > 0) ? 'PARTIALLY_PAID' : invoice.status

  await db.update(schema.invoices)
    .set({
      trustApplied: newTrustApplied,
      balanceDue: Math.max(0, newBalanceDue),
      status: newStatus,
      paidAt: newBalanceDue <= 0 ? transactionDate : null,
      updatedAt: transactionDate
    })
    .where(eq(schema.invoices.id, invoiceId))

  // Get client name for logging
  const clientName = await resolveEntityName('client', invoice.clientId)

  // Log activity
  await logActivity({
    type: 'TRUST_DISBURSEMENT_MADE',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
    relatedEntities: [
      { type: 'matter', id: invoice.matterId, name: await resolveEntityName('matter', invoice.matterId) || 'Unknown Matter' }
    ],
    event,
    details: {
      amount: applyAmount,
      invoiceNumber: invoice.invoiceNumber,
      newBalanceDue,
      newTrustBalance,
      invoicePaid: newBalanceDue <= 0
    }
  })

  // If fully paid, log that too
  if (newBalanceDue <= 0) {
    await logActivity({
      type: 'INVOICE_PAID',
      userId: user.id,
      userRole: user.role,
      target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
      event,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        paymentSource: 'trust',
        totalAmount: invoice.totalAmount
      }
    })
  }

  return {
    success: true,
    transaction: {
      id: transactionId,
      amount: applyAmount,
      transactionType: 'DISBURSEMENT'
    },
    invoice: {
      id: invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      trustApplied: newTrustApplied,
      balanceDue: Math.max(0, newBalanceDue),
      status: newStatus,
      isPaid: newBalanceDue <= 0
    },
    trustBalance: {
      previous: availableBalance,
      applied: applyAmount,
      remaining: newTrustBalance
    }
  }
})
