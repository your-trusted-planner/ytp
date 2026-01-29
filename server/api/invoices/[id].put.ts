import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

const updateInvoiceSchema = z.object({
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().int().min(0).max(10000).optional(),
  discountAmount: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  memo: z.string().optional()
})

/**
 * PUT /api/invoices/:id
 *
 * Update an invoice (only if in DRAFT status).
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
  const parsed = updateInvoiceSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get existing invoice
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' })
  }

  // Only allow editing DRAFT invoices
  if (invoice.status !== 'DRAFT') {
    throw createError({
      statusCode: 400,
      message: `Cannot edit invoice in ${invoice.status} status. Only DRAFT invoices can be modified.`
    })
  }

  // Build update object
  const updates: Record<string, any> = {
    updatedAt: new Date()
  }

  if (parsed.data.issueDate) {
    updates.issueDate = new Date(parsed.data.issueDate)
  }

  if (parsed.data.dueDate) {
    updates.dueDate = new Date(parsed.data.dueDate)
  }

  if (parsed.data.notes !== undefined) {
    updates.notes = parsed.data.notes
  }

  if (parsed.data.terms !== undefined) {
    updates.terms = parsed.data.terms
  }

  if (parsed.data.memo !== undefined) {
    updates.memo = parsed.data.memo
  }

  // Recalculate totals if tax rate or discount changed
  if (parsed.data.taxRate !== undefined || parsed.data.discountAmount !== undefined) {
    const taxRate = parsed.data.taxRate ?? invoice.taxRate
    const discountAmount = parsed.data.discountAmount ?? invoice.discountAmount
    const subtotal = invoice.subtotal

    const taxAmount = Math.round((subtotal * taxRate) / 10000)
    const totalAmount = subtotal + taxAmount - discountAmount
    const balanceDue = totalAmount - invoice.trustApplied - invoice.directPayments

    updates.taxRate = taxRate
    updates.taxAmount = taxAmount
    updates.discountAmount = discountAmount
    updates.totalAmount = totalAmount
    updates.balanceDue = Math.max(0, balanceDue)
  }

  // Update invoice
  await db.update(schema.invoices)
    .set(updates)
    .where(eq(schema.invoices.id, invoiceId))

  // Get client name for logging
  const clientName = await resolveEntityName('client', invoice.clientId)

  // Log activity
  await logActivity({
    type: 'INVOICE_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
    event,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      changes: Object.keys(updates).filter(k => k !== 'updatedAt')
    }
  })

  // Fetch updated invoice
  const [updatedInvoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))

  return {
    success: true,
    invoice: {
      ...updatedInvoice,
      invoice_number: updatedInvoice.invoiceNumber,
      total_amount: updatedInvoice.totalAmount,
      balance_due: updatedInvoice.balanceDue
    }
  }
})
