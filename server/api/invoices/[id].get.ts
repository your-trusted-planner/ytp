import { eq } from 'drizzle-orm'

/**
 * GET /api/invoices/:id
 *
 * Get invoice details with line items.
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

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get invoice with client and matter info
  const [invoice] = await db
    .select({
      id: schema.invoices.id,
      matterId: schema.invoices.matterId,
      clientId: schema.invoices.clientId,
      invoiceNumber: schema.invoices.invoiceNumber,
      status: schema.invoices.status,
      subtotal: schema.invoices.subtotal,
      taxRate: schema.invoices.taxRate,
      taxAmount: schema.invoices.taxAmount,
      discountAmount: schema.invoices.discountAmount,
      totalAmount: schema.invoices.totalAmount,
      trustApplied: schema.invoices.trustApplied,
      directPayments: schema.invoices.directPayments,
      balanceDue: schema.invoices.balanceDue,
      issueDate: schema.invoices.issueDate,
      dueDate: schema.invoices.dueDate,
      sentAt: schema.invoices.sentAt,
      paidAt: schema.invoices.paidAt,
      notes: schema.invoices.notes,
      terms: schema.invoices.terms,
      memo: schema.invoices.memo,
      pdfBlobKey: schema.invoices.pdfBlobKey,
      pdfGeneratedAt: schema.invoices.pdfGeneratedAt,
      createdBy: schema.invoices.createdBy,
      createdAt: schema.invoices.createdAt,
      updatedAt: schema.invoices.updatedAt,
      // Client info
      clientFirstName: schema.people.firstName,
      clientLastName: schema.people.lastName,
      clientFullName: schema.people.fullName,
      clientEmail: schema.people.email,
      clientAddress: schema.people.address,
      clientCity: schema.people.city,
      clientState: schema.people.state,
      clientZipCode: schema.people.zipCode,
      // Matter info
      matterTitle: schema.matters.title,
      matterNumber: schema.matters.matterNumber
    })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
    .where(eq(schema.invoices.id, invoiceId))

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' })
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))
    .orderBy(schema.invoiceLineItems.lineNumber)

  const clientName = invoice.clientFullName ||
    `${invoice.clientFirstName || ''} ${invoice.clientLastName || ''}`.trim() ||
    'Unknown'

  return {
    invoice: {
      ...invoice,
      clientName,
      lineItems: lineItems.map(item => ({
        ...item,
        // Snake case
        invoice_id: item.invoiceId,
        line_number: item.lineNumber,
        catalog_id: item.catalogId,
        unit_price: item.unitPrice,
        item_type: item.itemType,
        created_at: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt
      })),
      // Snake case for backward compatibility
      matter_id: invoice.matterId,
      client_id: invoice.clientId,
      invoice_number: invoice.invoiceNumber,
      tax_rate: invoice.taxRate,
      tax_amount: invoice.taxAmount,
      discount_amount: invoice.discountAmount,
      total_amount: invoice.totalAmount,
      trust_applied: invoice.trustApplied,
      direct_payments: invoice.directPayments,
      balance_due: invoice.balanceDue,
      issue_date: invoice.issueDate instanceof Date ? invoice.issueDate.getTime() : invoice.issueDate,
      due_date: invoice.dueDate instanceof Date ? invoice.dueDate.getTime() : invoice.dueDate,
      sent_at: invoice.sentAt instanceof Date ? invoice.sentAt.getTime() : invoice.sentAt,
      paid_at: invoice.paidAt instanceof Date ? invoice.paidAt.getTime() : invoice.paidAt,
      pdf_blob_key: invoice.pdfBlobKey,
      pdf_generated_at: invoice.pdfGeneratedAt instanceof Date ? invoice.pdfGeneratedAt.getTime() : invoice.pdfGeneratedAt,
      created_by: invoice.createdBy,
      created_at: invoice.createdAt instanceof Date ? invoice.createdAt.getTime() : invoice.createdAt,
      updated_at: invoice.updatedAt instanceof Date ? invoice.updatedAt.getTime() : invoice.updatedAt,
      client_name: clientName,
      client_email: invoice.clientEmail,
      client_address: invoice.clientAddress,
      client_city: invoice.clientCity,
      client_state: invoice.clientState,
      client_zip_code: invoice.clientZipCode,
      matter_title: invoice.matterTitle,
      matter_number: invoice.matterNumber
    }
  }
})
