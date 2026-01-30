import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import { generateInvoiceNumber } from '../../utils/invoice-number'

import { parseQuantity } from '../../utils/billing-rates'

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.union([
    z.number().positive(),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Quantity must be a valid positive number')
  ]).default(1),
  unitPrice: z.number().int().positive('Unit price must be positive (in cents)'),
  itemType: z.enum(['SERVICE', 'CONSULTATION', 'FILING_FEE', 'EXPENSE', 'ADJUSTMENT', 'HOURLY', 'OTHER']).default('SERVICE'),
  catalogId: z.string().optional(),
  timeEntryId: z.string().optional()
})

const createInvoiceSchema = z.object({
  matterId: z.string().min(1, 'Matter ID is required'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  taxRate: z.number().int().min(0).max(10000).default(0), // Basis points
  discountAmount: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  memo: z.string().optional()
})

/**
 * POST /api/invoices
 *
 * Create a new invoice with line items.
 * Invoice is created in DRAFT status.
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !['ADMIN', 'LAWYER', 'STAFF'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const parsed = createInvoiceSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation error',
      data: parsed.error.flatten()
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get matter and client info
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

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Calculate totals (handle decimal quantities for hourly billing)
  let subtotal = 0
  for (const item of parsed.data.lineItems) {
    const qty = parseQuantity(item.quantity)
    subtotal += Math.round(qty * item.unitPrice)
  }

  const taxAmount = Math.round((subtotal * parsed.data.taxRate) / 10000)
  const totalAmount = subtotal + taxAmount - parsed.data.discountAmount
  const balanceDue = totalAmount

  // Set default dates
  const now = new Date()
  const issueDate = parsed.data.issueDate ? new Date(parsed.data.issueDate) : now
  const dueDate = parsed.data.dueDate
    ? new Date(parsed.data.dueDate)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  // Create invoice
  const invoiceId = crypto.randomUUID()

  await db.insert(schema.invoices).values({
    id: invoiceId,
    matterId: parsed.data.matterId,
    clientId: matter.clientId,
    invoiceNumber,
    status: 'DRAFT',
    subtotal,
    taxRate: parsed.data.taxRate,
    taxAmount,
    discountAmount: parsed.data.discountAmount,
    totalAmount,
    trustApplied: 0,
    directPayments: 0,
    balanceDue,
    issueDate,
    dueDate,
    notes: parsed.data.notes ?? null,
    terms: parsed.data.terms ?? null,
    memo: parsed.data.memo ?? null,
    createdBy: user.id
  })

  // Create line items (store quantity as string for decimal support)
  for (let i = 0; i < parsed.data.lineItems.length; i++) {
    const item = parsed.data.lineItems[i]
    const qty = parseQuantity(item.quantity)
    await db.insert(schema.invoiceLineItems).values({
      id: crypto.randomUUID(),
      invoiceId,
      lineNumber: i + 1,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: item.unitPrice,
      amount: Math.round(qty * item.unitPrice),
      itemType: item.itemType,
      catalogId: item.catalogId ?? null,
      timeEntryId: item.timeEntryId ?? null
    })
  }

  // Get client name for logging
  const clientName = await resolveEntityName('client', matter.clientId)

  // Log activity
  await logActivity({
    type: 'INVOICE_CREATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'client', id: matter.clientId, name: clientName || 'Unknown Client' },
    relatedEntities: [
      { type: 'matter', id: matter.id, name: matter.title }
    ],
    event,
    details: {
      invoiceNumber,
      totalAmount,
      lineItemCount: parsed.data.lineItems.length
    }
  })

  // Fetch created invoice with line items
  const [invoice] = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))

  const lineItems = await db
    .select()
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId))
    .orderBy(schema.invoiceLineItems.lineNumber)

  return {
    success: true,
    invoice: {
      ...invoice,
      lineItems,
      // Snake case
      invoice_number: invoice.invoiceNumber,
      matter_id: invoice.matterId,
      client_id: invoice.clientId,
      total_amount: invoice.totalAmount,
      balance_due: invoice.balanceDue
    }
  }
})
