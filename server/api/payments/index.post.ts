import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

const recordPaymentSchema = z.object({
  matterId: z.string().min(1, 'Matter ID is required'),
  invoiceId: z.string().optional(),
  amount: z.number().int().positive('Amount must be positive (in cents)'),
  paymentType: z.enum(['CONSULTATION', 'DEPOSIT_50', 'FINAL_50', 'MAINTENANCE', 'CUSTOM']).default('CUSTOM'),
  paymentMethod: z.enum(['LAWPAY', 'CHECK', 'WIRE', 'CREDIT_CARD', 'ACH', 'OTHER']).default('OTHER'),
  checkNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().datetime().optional() // ISO datetime, defaults to now
})

/**
 * POST /api/payments
 *
 * Record a direct payment (not from trust).
 * Optionally applies to an invoice.
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = recordPaymentSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Verify matter exists
  const [matter] = await db
    .select({
      id: schema.matters.id,
      title: schema.matters.title,
      clientId: schema.matters.clientId
    })
    .from(schema.matters)
    .where(eq(schema.matters.id, parsed.data.matterId))

  if (!matter) {
    throw createError({ statusCode: 404, message: 'Matter not found' })
  }

  // If invoice specified, verify and update it
  let invoice = null
  if (parsed.data.invoiceId) {
    const [inv] = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, parsed.data.invoiceId))

    if (!inv) {
      throw createError({ statusCode: 404, message: 'Invoice not found' })
    }

    if (inv.matterId !== parsed.data.matterId) {
      throw createError({
        statusCode: 400,
        message: 'Invoice does not belong to this matter'
      })
    }

    invoice = inv
  }

  const paymentId = crypto.randomUUID()
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date()

  // Create payment
  await db.insert(schema.payments).values({
    id: paymentId,
    matterId: parsed.data.matterId,
    paymentType: parsed.data.paymentType,
    amount: parsed.data.amount,
    paymentMethod: parsed.data.paymentMethod,
    status: 'COMPLETED',
    fundSource: 'DIRECT',
    invoiceId: parsed.data.invoiceId ?? null,
    checkNumber: parsed.data.checkNumber ?? null,
    referenceNumber: parsed.data.referenceNumber ?? null,
    notes: parsed.data.notes ?? null,
    paidAt,
    recordedBy: user.id
  })

  // Update invoice if applicable
  if (invoice) {
    const newDirectPayments = invoice.directPayments + parsed.data.amount
    const newBalanceDue = invoice.totalAmount - invoice.trustApplied - newDirectPayments
    const newStatus = newBalanceDue <= 0 ? 'PAID' :
      (invoice.trustApplied > 0 || newDirectPayments > 0) ? 'PARTIALLY_PAID' : invoice.status

    await db.update(schema.invoices)
      .set({
        directPayments: newDirectPayments,
        balanceDue: Math.max(0, newBalanceDue),
        status: newStatus,
        paidAt: newBalanceDue <= 0 ? paidAt : null,
        updatedAt: new Date()
      })
      .where(eq(schema.invoices.id, invoice.id))

    // Log invoice paid if fully paid
    if (newBalanceDue <= 0) {
      const clientName = await resolveEntityName('client', invoice.clientId)
      await logActivity({
        type: 'INVOICE_PAID',
        userId: user.id,
        userRole: user.role,
        target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
        event,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          paymentSource: 'direct',
          totalAmount: invoice.totalAmount
        }
      })
    }
  }

  // Get client name for logging
  const clientName = await resolveEntityName('client', matter.clientId)

  // Log activity
  await logActivity({
    type: 'PAYMENT_RECEIVED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: matter.clientId, name: clientName || 'Unknown Client' },
    relatedEntities: [
      { type: 'matter', id: matter.id, name: matter.title }
    ],
    event,
    details: {
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      invoiceId: parsed.data.invoiceId,
      referenceNumber: parsed.data.referenceNumber
    }
  })

  return {
    success: true,
    payment: {
      id: paymentId,
      matterId: parsed.data.matterId,
      amount: parsed.data.amount,
      paymentType: parsed.data.paymentType,
      paymentMethod: parsed.data.paymentMethod,
      status: 'COMPLETED',
      paidAt: paidAt.toISOString()
    },
    invoice: invoice ? {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      directPayments: invoice.directPayments + parsed.data.amount,
      balanceDue: Math.max(0, invoice.totalAmount - invoice.trustApplied - invoice.directPayments - parsed.data.amount),
      isPaid: (invoice.totalAmount - invoice.trustApplied - invoice.directPayments - parsed.data.amount) <= 0
    } : null
  }
})
