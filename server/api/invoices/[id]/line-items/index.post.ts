import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'

const addLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().int().positive('Unit price must be positive (in cents)'),
  itemType: z.enum(['SERVICE', 'CONSULTATION', 'FILING_FEE', 'EXPENSE', 'ADJUSTMENT', 'OTHER']).default('SERVICE'),
  catalogId: z.string().optional()
})

/**
 * POST /api/invoices/:id/line-items
 *
 * Add a line item to an invoice.
 * Only allowed on DRAFT invoices.
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
  const parsed = addLineItemSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const db = useDrizzle()

  // Get invoice
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' })
  }

  if (invoice.status !== 'DRAFT') {
    throw createError({
      statusCode: 400,
      message: 'Can only add line items to DRAFT invoices'
    })
  }

  // Get next line number
  const [maxLine] = await db
    .select({ max: sql<number>`MAX(${schema.invoiceLineItems.lineNumber})` })
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))

  const nextLineNumber = (maxLine?.max ?? 0) + 1
  const amount = parsed.data.quantity * parsed.data.unitPrice

  // Create line item
  const lineItemId = crypto.randomUUID()
  await db.insert(schema.invoiceLineItems).values({
    id: lineItemId,
    invoiceId,
    lineNumber: nextLineNumber,
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unitPrice: parsed.data.unitPrice,
    amount,
    itemType: parsed.data.itemType,
    catalogId: parsed.data.catalogId ?? null
  })

  // Recalculate invoice totals
  const newSubtotal = invoice.subtotal + amount
  const newTaxAmount = Math.round((newSubtotal * (invoice.taxRate ?? 0)) / 10000)
  const newTotalAmount = newSubtotal + newTaxAmount - (invoice.discountAmount ?? 0)
  const newBalanceDue = newTotalAmount - invoice.trustApplied - invoice.directPayments

  await db.update(schema.invoices)
    .set({
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      balanceDue: Math.max(0, newBalanceDue),
      pdfBlobKey: null, // Invalidate cached PDF
      pdfGeneratedAt: null,
      updatedAt: new Date()
    })
    .where(eq(schema.invoices.id, invoiceId))

  return {
    success: true,
    lineItem: {
      id: lineItemId,
      invoiceId,
      lineNumber: nextLineNumber,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      amount,
      itemType: parsed.data.itemType
    },
    invoiceTotals: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      balanceDue: Math.max(0, newBalanceDue)
    }
  }
})
