import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'
import { generateInvoicePdf, type InvoicePdfOptions } from '../../../utils/invoice-pdf-generator'
import { sendEmail } from '../../../utils/email'

const sendInvoiceSchema = z.object({
  recipientEmail: z.string().email().optional(), // Override client email
  message: z.string().optional(), // Custom message
  regeneratePdf: z.boolean().default(false)
})

/**
 * POST /api/invoices/:id/send
 *
 * Send an invoice to the client via email.
 * Generates PDF if not already generated.
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
  const parsed = sendInvoiceSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

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

  // Cannot send VOID or CANCELLED invoices
  if (['VOID', 'CANCELLED'].includes(invoice.status)) {
    throw createError({
      statusCode: 400,
      message: `Cannot send ${invoice.status} invoice`
    })
  }

  const recipientEmail = parsed.data.recipientEmail || invoice.clientEmail
  if (!recipientEmail) {
    throw createError({
      statusCode: 400,
      message: 'No recipient email available. Client has no email on file.'
    })
  }

  const clientName = invoice.clientFullName ||
    `${invoice.clientFirstName || ''} ${invoice.clientLastName || ''}`.trim() ||
    'Valued Client'

  // Get line items
  const lineItems = await db
    .select()
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))
    .orderBy(schema.invoiceLineItems.lineNumber)

  // Generate PDF if needed
  let pdfBlobKey = invoice.pdfBlobKey

  if (!pdfBlobKey || parsed.data.regeneratePdf) {
    // Get firm settings for PDF header
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
      terms: invoice.terms ?? undefined
    }

    // Generate PDF
    const pdfBytes = await generateInvoicePdf(pdfOptions)

    // Store in blob storage
    const { blob } = await import('hub:blob')
    pdfBlobKey = `invoices/${invoice.invoiceNumber}.pdf`
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
  }

  // Send email
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(invoice.balanceDue / 100)

  const formattedDueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Due upon receipt'

  // Get PDF for attachment
  const { blob } = await import('hub:blob')
  const pdfData = await blob.get(pdfBlobKey)

  let attachments: { filename: string; content: string; type: string }[] = []
  if (pdfData) {
    const pdfBuffer = await pdfData.arrayBuffer()
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64')
    attachments = [{
      filename: `${invoice.invoiceNumber}.pdf`,
      content: base64Pdf,
      type: 'application/pdf'
    }]
  }

  const customMessage = parsed.data.message
    ? `<p style="margin-bottom: 20px;">${parsed.data.message}</p>`
    : ''

  await sendEmail({
    to: recipientEmail,
    subject: `Invoice ${invoice.invoiceNumber} - ${formattedTotal}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A2540;">Invoice ${invoice.invoiceNumber}</h2>
        ${customMessage}
        <p>Dear ${clientName},</p>
        <p>Please find attached your invoice for <strong>${invoice.matterTitle}</strong>.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Amount Due:</strong> ${formattedTotal}</p>
          <p style="margin: 10px 0 0;"><strong>Due Date:</strong> ${formattedDueDate}</p>
        </div>
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        <p>Thank you for your business.</p>
      </div>
    `,
    attachments
  })

  // Update invoice status
  await db.update(schema.invoices)
    .set({
      status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
      sentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.invoices.id, invoiceId))

  // Log activity
  await logActivity({
    type: 'INVOICE_SENT',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: invoice.clientId, name: clientName },
    relatedEntities: [
      { type: 'matter', id: invoice.matterId, name: invoice.matterTitle }
    ],
    event,
    details: {
      invoiceNumber: invoice.invoiceNumber,
      recipientEmail,
      totalAmount: invoice.totalAmount,
      balanceDue: invoice.balanceDue
    }
  })

  return {
    success: true,
    message: 'Invoice sent successfully',
    sentTo: recipientEmail,
    invoiceNumber: invoice.invoiceNumber
  }
})
