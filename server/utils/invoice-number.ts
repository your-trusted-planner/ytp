import { eq, and, like, desc } from 'drizzle-orm'

/**
 * Invoice Number Generator
 *
 * Format: INV-YYYY-NNNN
 * Example: INV-2026-0001, INV-2026-0002, etc.
 *
 * Generates unique, sequential invoice numbers per year.
 */

/**
 * Generate the next invoice number for the current year
 * @returns Promise<string> The next invoice number (e.g., "INV-2026-0001")
 */
export async function generateInvoiceNumber(): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const currentYear = new Date().getFullYear()
  const prefix = `INV-${currentYear}-`

  // Find the highest invoice number for this year
  const [lastInvoice] = await db
    .select({ invoiceNumber: schema.invoices.invoiceNumber })
    .from(schema.invoices)
    .where(like(schema.invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(schema.invoices.invoiceNumber))
    .limit(1)

  let nextNumber = 1

  if (lastInvoice?.invoiceNumber) {
    // Extract the sequence number from the last invoice
    const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  // Pad to 4 digits minimum, but allow more if needed
  const paddedNumber = nextNumber.toString().padStart(4, '0')

  return `${prefix}${paddedNumber}`
}

/**
 * Validate an invoice number format
 * @param invoiceNumber The invoice number to validate
 * @returns boolean True if valid format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  return /^INV-\d{4}-\d{4,}$/.test(invoiceNumber)
}

/**
 * Parse an invoice number into its components
 * @param invoiceNumber The invoice number to parse
 * @returns Object with year and sequence, or null if invalid
 */
export function parseInvoiceNumber(invoiceNumber: string): { year: number; sequence: number } | null {
  const match = invoiceNumber.match(/^INV-(\d{4})-(\d+)$/)
  if (!match) return null

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10)
  }
}
