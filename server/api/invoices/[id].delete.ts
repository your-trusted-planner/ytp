import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

/**
 * DELETE /api/invoices/:id
 *
 * Delete or void an invoice.
 * - DRAFT invoices are hard deleted
 * - Non-DRAFT invoices are voided (status set to VOID)
 *
 * Query params: forceVoid=true (void even if DRAFT)
 *
 * Requires: LAWYER or ADMIN role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Lawyer or Admin access required' })
  }

  const invoiceId = getRouterParam(event, 'id')
  if (!invoiceId) {
    throw createError({ statusCode: 400, message: 'Invoice ID is required' })
  }

  const query = getQuery(event)
  const forceVoid = query.forceVoid === 'true'

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

  // Get client name for logging
  const clientName = await resolveEntityName('client', invoice.clientId)

  if (invoice.status === 'DRAFT' && !forceVoid) {
    // Hard delete DRAFT invoices
    // First delete line items
    await db.delete(schema.invoiceLineItems)
      .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))

    // Then delete invoice
    await db.delete(schema.invoices)
      .where(eq(schema.invoices.id, invoiceId))

    // Log activity
    await logActivity({
      type: 'INVOICE_CANCELLED',
      userId: user.id,
      userRole: user.role,
      target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
      event,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        action: 'deleted'
      }
    })

    return {
      success: true,
      message: 'Invoice deleted',
      action: 'deleted'
    }
  } else {
    // Void non-DRAFT invoices
    await db.update(schema.invoices)
      .set({
        status: 'VOID',
        updatedAt: new Date()
      })
      .where(eq(schema.invoices.id, invoiceId))

    // Log activity
    await logActivity({
      type: 'INVOICE_VOID',
      userId: user.id,
      userRole: user.role,
      target: { type: 'client', id: invoice.clientId, name: clientName || 'Unknown Client' },
      event,
      details: {
        invoiceNumber: invoice.invoiceNumber,
        previousStatus: invoice.status
      }
    })

    return {
      success: true,
      message: 'Invoice voided',
      action: 'voided'
    }
  }
})
