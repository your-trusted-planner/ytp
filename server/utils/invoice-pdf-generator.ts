/**
 * Invoice PDF Generator
 *
 * Generates professional invoice PDFs using pdf-lib.
 * Includes firm branding, line items, payment info, and trust balance details.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number // cents
  amount: number // cents
  itemType: string
}

export interface InvoicePdfOptions {
  invoice: {
    id: string
    invoiceNumber: string
    issueDate: Date
    dueDate: Date
    status: string
  }
  client: {
    name: string
    email?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
  matter: {
    title: string
    matterNumber?: string
  }
  firm: {
    name: string
    address?: string
    phone?: string
    email?: string
    website?: string
  }
  lineItems: InvoiceLineItem[]
  totals: {
    subtotal: number // cents
    taxRate: number // basis points (825 = 8.25%)
    taxAmount: number // cents
    discountAmount: number // cents
    totalAmount: number // cents
    trustApplied: number // cents
    directPayments: number // cents
    balanceDue: number // cents
  }
  notes?: string
  terms?: string
  trustBalance?: number // cents - client's current trust balance
}

/**
 * Format cents as currency string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

/**
 * Format date as readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Draw a horizontal line
 */
function drawLine(
  page: any,
  startX: number,
  endX: number,
  y: number,
  color = rgb(0.85, 0.85, 0.85),
  thickness = 1
) {
  page.drawLine({
    start: { x: startX, y },
    end: { x: endX, y },
    thickness,
    color
  })
}

/**
 * Generate an invoice PDF
 */
export async function generateInvoicePdf(options: InvoicePdfOptions): Promise<Uint8Array> {
  const { invoice, client, matter, firm, lineItems, totals, notes, terms, trustBalance } = options

  // Create PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Page settings
  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const marginLeft = 50
  const marginRight = 50
  const marginTop = 50
  const marginBottom = 50
  const contentWidth = pageWidth - marginLeft - marginRight

  // Create first page
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let currentY = pageHeight - marginTop

  // Colors
  const primaryColor = rgb(0.04, 0.15, 0.25) // #0A2540 - dark blue
  const secondaryColor = rgb(0.4, 0.4, 0.4) // gray
  const accentColor = rgb(0.77, 0.12, 0.23) // #C41E3A - red
  const lightGray = rgb(0.95, 0.95, 0.95)

  // ===== HEADER SECTION =====

  // Invoice title (left)
  page.drawText('INVOICE', {
    x: marginLeft,
    y: currentY,
    size: 28,
    font: helveticaBold,
    color: primaryColor
  })

  // Invoice number (right)
  page.drawText(invoice.invoiceNumber, {
    x: pageWidth - marginRight - helveticaBold.widthOfTextAtSize(invoice.invoiceNumber, 14),
    y: currentY,
    size: 14,
    font: helveticaBold,
    color: primaryColor
  })

  currentY -= 35

  // Status badge
  const statusColors: Record<string, typeof accentColor> = {
    DRAFT: rgb(0.5, 0.5, 0.5),
    SENT: rgb(0.2, 0.4, 0.8),
    VIEWED: rgb(0.2, 0.4, 0.8),
    PAID: rgb(0.13, 0.55, 0.13),
    PARTIALLY_PAID: rgb(0.85, 0.65, 0.13),
    OVERDUE: accentColor,
    CANCELLED: rgb(0.5, 0.5, 0.5),
    VOID: rgb(0.5, 0.5, 0.5)
  }
  const statusColor = statusColors[invoice.status] || secondaryColor

  page.drawText(invoice.status.replace('_', ' '), {
    x: marginLeft,
    y: currentY,
    size: 10,
    font: helveticaBold,
    color: statusColor
  })

  currentY -= 30

  // Separator
  drawLine(page, marginLeft, pageWidth - marginRight, currentY, primaryColor, 2)
  currentY -= 25

  // ===== FROM / TO SECTION =====

  const fromToY = currentY
  const colWidth = contentWidth / 2 - 20

  // FROM section
  page.drawText('FROM', {
    x: marginLeft,
    y: currentY,
    size: 9,
    font: helveticaBold,
    color: secondaryColor
  })
  currentY -= 15

  page.drawText(firm.name, {
    x: marginLeft,
    y: currentY,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })
  currentY -= 14

  if (firm.address) {
    page.drawText(firm.address, {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    currentY -= 12
  }

  if (firm.phone) {
    page.drawText(firm.phone, {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    currentY -= 12
  }

  if (firm.email) {
    page.drawText(firm.email, {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    currentY -= 12
  }

  // TO section (right column)
  let toY = fromToY
  const toX = marginLeft + colWidth + 40

  page.drawText('BILL TO', {
    x: toX,
    y: toY,
    size: 9,
    font: helveticaBold,
    color: secondaryColor
  })
  toY -= 15

  page.drawText(client.name, {
    x: toX,
    y: toY,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })
  toY -= 14

  if (client.address) {
    page.drawText(client.address, {
      x: toX,
      y: toY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    toY -= 12
  }

  if (client.city || client.state || client.zipCode) {
    const cityStateZip = [client.city, client.state, client.zipCode].filter(Boolean).join(', ')
    page.drawText(cityStateZip, {
      x: toX,
      y: toY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    toY -= 12
  }

  if (client.email) {
    page.drawText(client.email, {
      x: toX,
      y: toY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    toY -= 12
  }

  currentY = Math.min(currentY, toY) - 20

  // ===== DATES SECTION =====

  // Invoice date box
  page.drawRectangle({
    x: marginLeft,
    y: currentY - 40,
    width: 140,
    height: 40,
    color: lightGray
  })

  page.drawText('Invoice Date', {
    x: marginLeft + 10,
    y: currentY - 15,
    size: 9,
    font: helvetica,
    color: secondaryColor
  })

  page.drawText(formatDate(invoice.issueDate), {
    x: marginLeft + 10,
    y: currentY - 30,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })

  // Due date box
  page.drawRectangle({
    x: marginLeft + 160,
    y: currentY - 40,
    width: 140,
    height: 40,
    color: lightGray
  })

  page.drawText('Due Date', {
    x: marginLeft + 170,
    y: currentY - 15,
    size: 9,
    font: helvetica,
    color: secondaryColor
  })

  page.drawText(formatDate(invoice.dueDate), {
    x: marginLeft + 170,
    y: currentY - 30,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })

  // Balance due box (highlighted)
  const balanceDueWidth = 160
  page.drawRectangle({
    x: pageWidth - marginRight - balanceDueWidth,
    y: currentY - 40,
    width: balanceDueWidth,
    height: 40,
    color: primaryColor
  })

  page.drawText('Balance Due', {
    x: pageWidth - marginRight - balanceDueWidth + 10,
    y: currentY - 15,
    size: 9,
    font: helvetica,
    color: rgb(1, 1, 1)
  })

  page.drawText(formatCurrency(totals.balanceDue), {
    x: pageWidth - marginRight - balanceDueWidth + 10,
    y: currentY - 30,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1)
  })

  currentY -= 60

  // Matter reference
  if (matter.title || matter.matterNumber) {
    currentY -= 10
    page.drawText('Matter: ', {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helveticaBold,
      color: secondaryColor
    })
    const matterText = matter.matterNumber
      ? `${matter.title} (${matter.matterNumber})`
      : matter.title
    page.drawText(matterText, {
      x: marginLeft + helveticaBold.widthOfTextAtSize('Matter: ', 10),
      y: currentY,
      size: 10,
      font: helvetica,
      color: primaryColor
    })
    currentY -= 25
  }

  // ===== LINE ITEMS TABLE =====

  const tableX = marginLeft
  const descColWidth = 280
  const qtyColWidth = 50
  const priceColWidth = 90
  const amountColWidth = 90

  // Table header
  page.drawRectangle({
    x: tableX,
    y: currentY - 20,
    width: contentWidth,
    height: 20,
    color: lightGray
  })

  page.drawText('Description', {
    x: tableX + 5,
    y: currentY - 14,
    size: 9,
    font: helveticaBold,
    color: primaryColor
  })

  page.drawText('Qty', {
    x: tableX + descColWidth + 15,
    y: currentY - 14,
    size: 9,
    font: helveticaBold,
    color: primaryColor
  })

  page.drawText('Unit Price', {
    x: tableX + descColWidth + qtyColWidth + 25,
    y: currentY - 14,
    size: 9,
    font: helveticaBold,
    color: primaryColor
  })

  page.drawText('Amount', {
    x: tableX + descColWidth + qtyColWidth + priceColWidth + 35,
    y: currentY - 14,
    size: 9,
    font: helveticaBold,
    color: primaryColor
  })

  currentY -= 25

  // Table rows
  for (const item of lineItems) {
    if (currentY < marginBottom + 150) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - marginTop
    }

    page.drawText(item.description, {
      x: tableX + 5,
      y: currentY - 12,
      size: 10,
      font: helvetica,
      color: primaryColor
    })

    page.drawText(item.quantity.toString(), {
      x: tableX + descColWidth + 15,
      y: currentY - 12,
      size: 10,
      font: helvetica,
      color: primaryColor
    })

    page.drawText(formatCurrency(item.unitPrice), {
      x: tableX + descColWidth + qtyColWidth + 25,
      y: currentY - 12,
      size: 10,
      font: helvetica,
      color: primaryColor
    })

    page.drawText(formatCurrency(item.amount), {
      x: tableX + descColWidth + qtyColWidth + priceColWidth + 35,
      y: currentY - 12,
      size: 10,
      font: helvetica,
      color: primaryColor
    })

    currentY -= 20

    // Row separator
    drawLine(page, tableX, tableX + contentWidth, currentY)
  }

  currentY -= 20

  // ===== TOTALS SECTION =====

  const totalsX = tableX + descColWidth + qtyColWidth

  // Subtotal
  page.drawText('Subtotal:', {
    x: totalsX,
    y: currentY,
    size: 10,
    font: helvetica,
    color: secondaryColor
  })
  page.drawText(formatCurrency(totals.subtotal), {
    x: tableX + contentWidth - helvetica.widthOfTextAtSize(formatCurrency(totals.subtotal), 10),
    y: currentY,
    size: 10,
    font: helvetica,
    color: primaryColor
  })
  currentY -= 15

  // Tax (if applicable)
  if (totals.taxRate > 0 && totals.taxAmount > 0) {
    const taxLabel = `Tax (${(totals.taxRate / 100).toFixed(2)}%):`
    page.drawText(taxLabel, {
      x: totalsX,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    page.drawText(formatCurrency(totals.taxAmount), {
      x: tableX + contentWidth - helvetica.widthOfTextAtSize(formatCurrency(totals.taxAmount), 10),
      y: currentY,
      size: 10,
      font: helvetica,
      color: primaryColor
    })
    currentY -= 15
  }

  // Discount (if applicable)
  if (totals.discountAmount > 0) {
    page.drawText('Discount:', {
      x: totalsX,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    page.drawText(`-${formatCurrency(totals.discountAmount)}`, {
      x: tableX + contentWidth - helvetica.widthOfTextAtSize(`-${formatCurrency(totals.discountAmount)}`, 10),
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.13, 0.55, 0.13)
    })
    currentY -= 15
  }

  // Total
  drawLine(page, totalsX, tableX + contentWidth, currentY + 5)
  page.drawText('Total:', {
    x: totalsX,
    y: currentY - 10,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })
  page.drawText(formatCurrency(totals.totalAmount), {
    x: tableX + contentWidth - helveticaBold.widthOfTextAtSize(formatCurrency(totals.totalAmount), 11),
    y: currentY - 10,
    size: 11,
    font: helveticaBold,
    color: primaryColor
  })
  currentY -= 25

  // Trust applied (if applicable)
  if (totals.trustApplied > 0) {
    page.drawText('Applied from Trust:', {
      x: totalsX,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    page.drawText(`-${formatCurrency(totals.trustApplied)}`, {
      x: tableX + contentWidth - helvetica.widthOfTextAtSize(`-${formatCurrency(totals.trustApplied)}`, 10),
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.13, 0.55, 0.13)
    })
    currentY -= 15
  }

  // Direct payments (if applicable)
  if (totals.directPayments > 0) {
    page.drawText('Payments Received:', {
      x: totalsX,
      y: currentY,
      size: 10,
      font: helvetica,
      color: secondaryColor
    })
    page.drawText(`-${formatCurrency(totals.directPayments)}`, {
      x: tableX + contentWidth - helvetica.widthOfTextAtSize(`-${formatCurrency(totals.directPayments)}`, 10),
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.13, 0.55, 0.13)
    })
    currentY -= 15
  }

  // Balance due (highlighted)
  if (totals.trustApplied > 0 || totals.directPayments > 0) {
    currentY -= 5
    page.drawRectangle({
      x: totalsX - 10,
      y: currentY - 20,
      width: contentWidth - descColWidth - qtyColWidth + 20,
      height: 25,
      color: primaryColor
    })

    page.drawText('Balance Due:', {
      x: totalsX,
      y: currentY - 13,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    })
    page.drawText(formatCurrency(totals.balanceDue), {
      x: tableX + contentWidth - helveticaBold.widthOfTextAtSize(formatCurrency(totals.balanceDue), 11),
      y: currentY - 13,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    })
    currentY -= 30
  }

  // Trust balance info (if applicable)
  if (trustBalance !== undefined && trustBalance > 0) {
    currentY -= 15
    page.drawRectangle({
      x: marginLeft,
      y: currentY - 30,
      width: contentWidth,
      height: 30,
      color: rgb(0.93, 0.97, 0.93),
      borderColor: rgb(0.13, 0.55, 0.13),
      borderWidth: 1
    })

    page.drawText(`Your trust account balance: ${formatCurrency(trustBalance)}`, {
      x: marginLeft + 10,
      y: currentY - 20,
      size: 10,
      font: helvetica,
      color: rgb(0.13, 0.55, 0.13)
    })
    currentY -= 45
  }

  // ===== NOTES & TERMS =====

  if (notes) {
    currentY -= 20
    page.drawText('Notes:', {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helveticaBold,
      color: secondaryColor
    })
    currentY -= 15

    page.drawText(notes, {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helvetica,
      color: primaryColor
    })
    currentY -= 20
  }

  if (terms) {
    currentY -= 10
    page.drawText('Terms & Conditions:', {
      x: marginLeft,
      y: currentY,
      size: 10,
      font: helveticaBold,
      color: secondaryColor
    })
    currentY -= 15

    page.drawText(terms, {
      x: marginLeft,
      y: currentY,
      size: 9,
      font: helvetica,
      color: secondaryColor
    })
  }

  // ===== FOOTER =====

  page.drawText('Thank you for your business.', {
    x: marginLeft,
    y: marginBottom + 20,
    size: 10,
    font: helvetica,
    color: secondaryColor
  })

  // Set document metadata
  pdfDoc.setTitle(`Invoice ${invoice.invoiceNumber}`)
  pdfDoc.setSubject(`Invoice for ${client.name}`)
  pdfDoc.setCreator('YourTrustedPlanner.com')
  pdfDoc.setProducer('pdf-lib')
  pdfDoc.setCreationDate(new Date())

  // Serialize PDF to bytes
  return pdfDoc.save()
}
