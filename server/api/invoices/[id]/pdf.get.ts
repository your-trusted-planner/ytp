import { eq } from 'drizzle-orm'
import { generateInvoicePdf, type InvoicePdfOptions } from '../../../utils/invoice-pdf-generator'
import { getClientTrustBalance } from '../../../utils/trust-ledger'

/**
 * GET /api/invoices/:id/pdf
 *
 * Download the invoice PDF.
 * Generates PDF on-the-fly if not cached.
 *
 * Query params: regenerate=true (force regeneration)
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

  const query = getQuery(event)
  const regenerate = query.regenerate === 'true'

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get invoice with full details
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
      notes: schema.invoices.notes,
      terms: schema.invoices.terms,
      pdfBlobKey: schema.invoices.pdfBlobKey,
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

  const { blob } = await import('hub:blob')

  // Check if we have a cached PDF and it's not a regenerate request
  if (invoice.pdfBlobKey && !regenerate) {
    try {
      const cachedPdf = await blob.get(invoice.pdfBlobKey)
      if (cachedPdf) {
        const pdfBytes = await cachedPdf.arrayBuffer()

        setResponseHeaders(event, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
          'Cache-Control': 'private, max-age=3600'
        })

        return new Uint8Array(pdfBytes)
      }
    } catch (e) {
      // PDF not found in blob, will regenerate
    }
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

  // Get client's current trust balance
  const trustBalance = await getClientTrustBalance(invoice.clientId, invoice.matterId)

  // Get firm settings
  const firmName = 'Your Trusted Planner' // TODO: Get from settings
  const firmAddress = '' // TODO: Get from settings
  const firmPhone = '' // TODO: Get from settings
  const firmEmail = '' // TODO: Get from settings

  const pdfOptions: InvoicePdfOptions = {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate || new Date(),
      dueDate: invoice.dueDate || new Date(),
      status: invoice.status
    },
    client: {
      name: clientName,
      email: invoice.clientEmail ?? undefined,
      address: invoice.clientAddress ?? undefined,
      city: invoice.clientCity ?? undefined,
      state: invoice.clientState ?? undefined,
      zipCode: invoice.clientZipCode ?? undefined
    },
    matter: {
      title: invoice.matterTitle,
      matterNumber: invoice.matterNumber ?? undefined
    },
    firm: {
      name: firmName,
      address: firmAddress,
      phone: firmPhone,
      email: firmEmail
    },
    lineItems: lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      itemType: item.itemType
    })),
    totals: {
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate ?? 0,
      taxAmount: invoice.taxAmount ?? 0,
      discountAmount: invoice.discountAmount ?? 0,
      totalAmount: invoice.totalAmount,
      trustApplied: invoice.trustApplied,
      directPayments: invoice.directPayments,
      balanceDue: invoice.balanceDue
    },
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    trustBalance: trustBalance > 0 ? trustBalance : undefined
  }

  // Generate PDF
  const pdfBytes = await generateInvoicePdf(pdfOptions)

  // Cache the PDF
  const pdfBlobKey = `invoices/${invoice.invoiceNumber}.pdf`
  await blob.put(pdfBlobKey, pdfBytes, {
    contentType: 'application/pdf'
  })

  // Update invoice with PDF info
  await db.update(schema.invoices)
    .set({
      pdfBlobKey,
      pdfGeneratedAt: new Date()
    })
    .where(eq(schema.invoices.id, invoiceId))

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    'Cache-Control': 'private, max-age=3600'
  })

  return pdfBytes
})
