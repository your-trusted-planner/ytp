import { eq, and, sql, gt } from 'drizzle-orm'

/**
 * DELETE /api/invoices/:id/line-items/:lineId
 *
 * Remove a line item from an invoice.
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
      message: 'Can only remove line items from DRAFT invoices'
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

  // Delete line item
  await db.delete(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.id, lineId))

  // Renumber remaining line items to fill the gap
  await db.update(schema.invoiceLineItems)
    .set({
      lineNumber: sql`${schema.invoiceLineItems.lineNumber} - 1`
    })
    .where(and(
      eq(schema.invoiceLineItems.invoiceId, invoiceId),
      gt(schema.invoiceLineItems.lineNumber, lineItem.lineNumber)
    ))

  // Recalculate invoice totals
  const [subtotalResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${schema.invoiceLineItems.amount}), 0)` })
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
    message: 'Line item removed',
    invoiceTotals: {
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      balanceDue: Math.max(0, newBalanceDue)
    }
  }
})
