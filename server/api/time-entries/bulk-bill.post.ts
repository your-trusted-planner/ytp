// Convert approved time entries to invoice line items
import { nanoid } from 'nanoid'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import { parseQuantity } from '../../utils/billing-rates'

const bulkBillSchema = z.object({
  timeEntryIds: z.array(z.string()).min(1),
  invoiceId: z.string().min(1).optional(),
  matterId: z.string().min(1).optional()  // Required when creating new invoice
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const parsed = bulkBillSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { timeEntryIds, invoiceId, matterId } = parsed.data

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  let invoice: any

  if (invoiceId) {
    // Verify invoice exists and is in DRAFT status
    const [existingInvoice] = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, invoiceId))
      .limit(1)

    if (!existingInvoice) {
      throw createError({
        statusCode: 404,
        message: 'Invoice not found'
      })
    }

    if (existingInvoice.status !== 'DRAFT') {
      throw createError({
        statusCode: 400,
        message: 'Can only add time entries to DRAFT invoices'
      })
    }

    invoice = existingInvoice
  } else {
    // Create new invoice - matterId is required
    if (!matterId) {
      throw createError({
        statusCode: 400,
        message: 'Matter ID is required when creating a new invoice'
      })
    }

    // Get matter details for the invoice
    const [matter] = await db
      .select({
        id: schema.matters.id,
        clientId: schema.matters.clientId,
        title: schema.matters.title
      })
      .from(schema.matters)
      .where(eq(schema.matters.id, matterId))
      .limit(1)

    if (!matter) {
      throw createError({
        statusCode: 404,
        message: 'Matter not found'
      })
    }

    // Generate invoice number
    const year = new Date().getFullYear()
    const [lastInvoice] = await db
      .select({ invoiceNumber: schema.invoices.invoiceNumber })
      .from(schema.invoices)
      .where(sql`${schema.invoices.invoiceNumber} LIKE ${`INV-${year}-%`}`)
      .orderBy(sql`CAST(SUBSTR(${schema.invoices.invoiceNumber}, -4) AS INTEGER) DESC`)
      .limit(1)

    let nextNumber = 1
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-\d+-(\d+)/)
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    const invoiceNumber = `INV-${year}-${nextNumber.toString().padStart(4, '0')}`

    // Calculate due date (30 days from now)
    const issueDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const newInvoiceId = nanoid()
    const newInvoice = {
      id: newInvoiceId,
      invoiceNumber,
      matterId,
      clientId: matter.clientId,
      issueDate,
      dueDate,
      status: 'DRAFT' as const,
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      trustApplied: 0,
      directPayments: 0,
      balanceDue: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.insert(schema.invoices).values(newInvoice)
    invoice = newInvoice
  }

  // Get all specified time entries
  const entries = await db
    .select()
    .from(schema.timeEntries)
    .where(inArray(schema.timeEntries.id, timeEntryIds))
    .all()

  if (entries.length !== timeEntryIds.length) {
    throw createError({
      statusCode: 404,
      message: 'Some time entries were not found'
    })
  }

  // Verify all entries are APPROVED and billable
  const invalidEntries = entries.filter(
    e => e.status !== 'APPROVED' || !e.isBillable
  )

  if (invalidEntries.length > 0) {
    throw createError({
      statusCode: 400,
      message: `${invalidEntries.length} entries are not approved or not billable. Only approved, billable time entries can be added to invoices.`
    })
  }

  // Verify all entries are for the same matter as the invoice
  const wrongMatterEntries = entries.filter(e => e.matterId !== invoice.matterId)

  if (wrongMatterEntries.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'All time entries must belong to the same matter as the invoice'
    })
  }

  // Get the current max line number for this invoice
  const existingLineItems = await db
    .select({ lineNumber: schema.invoiceLineItems.lineNumber })
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoice.id))
    .all()

  let nextLineNumber = existingLineItems.length > 0
    ? Math.max(...existingLineItems.map(li => li.lineNumber)) + 1
    : 1

  // Create line items for each time entry
  const lineItems = []
  const now = new Date()

  for (const entry of entries) {
    const lineItemId = nanoid()

    // Get user name for description
    const [entryUser] = await db
      .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
      .from(schema.users)
      .where(eq(schema.users.id, entry.userId))
      .limit(1)

    const userName = entryUser
      ? [entryUser.firstName, entryUser.lastName].filter(Boolean).join(' ')
      : 'Unknown'

    const workDateStr = entry.workDate
      ? new Date(entry.workDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : ''

    // Create line item
    const lineItem = {
      id: lineItemId,
      invoiceId: invoice.id,
      lineNumber: nextLineNumber++,
      description: `${workDateStr} - ${userName}: ${entry.description}`,
      quantity: entry.hours,
      unitPrice: entry.hourlyRate || 0,
      amount: entry.amount || 0,
      itemType: 'HOURLY' as const,
      timeEntryId: entry.id,
      createdAt: now
    }

    lineItems.push(lineItem)

    await db.insert(schema.invoiceLineItems).values(lineItem)

    // Update time entry to BILLED status
    await db
      .update(schema.timeEntries)
      .set({
        status: 'BILLED',
        invoiceId: invoice.id,
        invoiceLineItemId: lineItemId,
        updatedAt: now
      })
      .where(eq(schema.timeEntries.id, entry.id))
  }

  // Recalculate invoice totals
  const allLineItems = await db
    .select({ amount: schema.invoiceLineItems.amount })
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoice.id))
    .all()

  const subtotal = allLineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const taxAmount = Math.round(subtotal * (invoice.taxRate || 0) / 10000)
  const totalAmount = subtotal + taxAmount - (invoice.discountAmount || 0)
  const balanceDue = totalAmount - (invoice.trustApplied || 0) - (invoice.directPayments || 0)

  await db
    .update(schema.invoices)
    .set({
      subtotal,
      taxAmount,
      totalAmount,
      balanceDue,
      updatedAt: now
    })
    .where(eq(schema.invoices.id, invoice.id))

  // Log the activity
  const matterName = await resolveEntityName('matter', invoice.matterId)

  await logActivity({
    type: 'TIME_ENTRIES_BILLED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: invoice.matterId, name: matterName } : undefined,
    event,
    details: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      timeEntryCount: entries.length,
      totalAmount: lineItems.reduce((sum, li) => sum + li.amount, 0)
    }
  })

  return {
    success: true,
    lineItemsCreated: lineItems.length,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal,
      taxAmount,
      totalAmount,
      balanceDue
    }
  }
})
