import { z } from 'zod'
import { eq, and, sum, sql } from 'drizzle-orm'
import { parseQuantity } from '../../../../utils/billing-rates'

const updateLineItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Quantity must be a valid positive number')
  ]).optional(),
  unitPrice: z.number().int().positive().optional(),
  itemType: z.enum(['SERVICE', 'CONSULTATION', 'FILING_FEE', 'EXPENSE', 'ADJUSTMENT', 'HOURLY', 'OTHER']).optional()
})

/**
 * PUT /api/invoices/:id/line-items/:lineId
 *
 * Update a line item on an invoice.
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
  const lineId = getRouterParam(event, 'lineId')

  if (!invoiceId || !lineId) {
    throw createError({ statusCode: 400, message: 'Invoice ID and Line Item ID are required' })
  }

  const body = await readBody(event)
  const parsed = updateLineItemSchema.safeParse(body)

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
      message: 'Can only update line items on DRAFT invoices'
    })
  }

  // Get existing line item
  const [lineItem] = await db
    .select()
    .from(schema.invoiceLineItems)
    .where(and(
      eq(schema.invoiceLineItems.id, lineId),
      eq(schema.invoiceLineItems.invoiceId, invoiceId)
    ))

  if (!lineItem) {
    throw createError({ statusCode: 404, message: 'Line item not found' })
  }

  // Build update
  const updates: Record<string, any> = {}

  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description
  }
  if (parsed.data.itemType !== undefined) {
    updates.itemType = parsed.data.itemType
  }

  // Handle quantity/price changes (support decimal quantities for hourly billing)
  const newQuantityRaw = parsed.data.quantity ?? lineItem.quantity
  const newQuantity = parseQuantity(newQuantityRaw)
  const newUnitPrice = parsed.data.unitPrice ?? lineItem.unitPrice
  const newAmount = Math.round(newQuantity * newUnitPrice)

  if (parsed.data.quantity !== undefined) {
    updates.quantity = String(parsed.data.quantity)
  }
  if (parsed.data.unitPrice !== undefined) {
    updates.unitPrice = newUnitPrice
  }
  updates.amount = newAmount

  // Update line item
  await db.update(schema.invoiceLineItems)
    .set(updates)
    .where(eq(schema.invoiceLineItems.id, lineId))

  // Recalculate invoice totals
  const [subtotalResult] = await db
    .select({ total: sql<number>`SUM(${schema.invoiceLineItems.amount})` })
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))

  const newSubtotal = subtotalResult?.total ?? 0
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
      id: lineId,
      invoiceId,
      description: parsed.data.description ?? lineItem.description,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
      amount: newAmount,
      itemType: parsed.data.itemType ?? lineItem.itemType
    },
    invoiceTotals: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      balanceDue: Math.max(0, newBalanceDue)
    }
  }
})
