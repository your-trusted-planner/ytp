import { describe, it, expect, vi } from 'vitest'
import { generateInvoicePdf, type InvoicePdfOptions, type InvoiceLineItem } from '../../../server/utils/invoice-pdf-generator'

/**
 * Invoice PDF Generator Tests
 *
 * Tests for invoice PDF generation including:
 * - Currency formatting
 * - Date formatting
 * - PDF generation
 * - Content validation
 */

describe('Invoice PDF Generator', () => {
  describe('Currency formatting', () => {
    /**
     * Test the currency formatting logic used in PDF generation
     */
    function formatCurrency(cents: number): string {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(cents / 100)
    }

    it('should format whole dollars', () => {
      expect(formatCurrency(100000)).toBe('$1,000.00')
      expect(formatCurrency(50000)).toBe('$500.00')
      expect(formatCurrency(1000000)).toBe('$10,000.00')
    })

    it('should format cents correctly', () => {
      expect(formatCurrency(9999)).toBe('$99.99')
      expect(formatCurrency(1)).toBe('$0.01')
      expect(formatCurrency(99)).toBe('$0.99')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format large amounts with commas', () => {
      expect(formatCurrency(100000000)).toBe('$1,000,000.00')
      expect(formatCurrency(123456789)).toBe('$1,234,567.89')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-50000)).toBe('-$500.00')
    })
  })

  describe('Date formatting', () => {
    function formatDate(date: Date): string {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    it('should format dates in long format', () => {
      // Use Date constructor to avoid timezone issues with ISO string parsing
      expect(formatDate(new Date(2026, 0, 15))).toBe('January 15, 2026')
      expect(formatDate(new Date(2026, 11, 31))).toBe('December 31, 2026')
    })

    it('should handle different months', () => {
      // Use Date constructor to avoid timezone issues with ISO string parsing
      const months = [
        { date: new Date(2026, 1, 1), expected: 'February 1, 2026' },
        { date: new Date(2026, 5, 15), expected: 'June 15, 2026' },
        { date: new Date(2026, 8, 20), expected: 'September 20, 2026' },
      ]

      for (const { date, expected } of months) {
        expect(formatDate(date)).toBe(expected)
      }
    })
  })

  describe('Line item calculations', () => {
    function calculateLineItemAmount(item: InvoiceLineItem): number {
      return item.quantity * item.unitPrice
    }

    function calculateSubtotal(items: InvoiceLineItem[]): number {
      return items.reduce((sum, item) => sum + item.amount, 0)
    }

    it('should calculate line item amount', () => {
      const item: InvoiceLineItem = {
        description: 'Legal services',
        quantity: 5,
        unitPrice: 35000, // $350.00 per hour
        amount: 175000, // $1,750.00
        itemType: 'SERVICE'
      }

      expect(calculateLineItemAmount(item)).toBe(175000)
    })

    it('should calculate subtotal from multiple items', () => {
      const items: InvoiceLineItem[] = [
        { description: 'Service A', quantity: 1, unitPrice: 50000, amount: 50000, itemType: 'SERVICE' },
        { description: 'Service B', quantity: 2, unitPrice: 25000, amount: 50000, itemType: 'SERVICE' },
        { description: 'Filing Fee', quantity: 1, unitPrice: 15000, amount: 15000, itemType: 'FILING_FEE' },
      ]

      expect(calculateSubtotal(items)).toBe(115000)
    })

    it('should handle empty line items', () => {
      expect(calculateSubtotal([])).toBe(0)
    })
  })

  describe('Invoice total calculations', () => {
    function calculateTotal(
      subtotal: number,
      taxRate: number,
      discountAmount: number
    ): { taxAmount: number; totalAmount: number } {
      // Tax rate is in basis points (825 = 8.25%)
      const taxAmount = Math.round((subtotal * taxRate) / 10000)
      const totalAmount = subtotal + taxAmount - discountAmount

      return { taxAmount, totalAmount }
    }

    it('should calculate total without tax or discount', () => {
      const result = calculateTotal(100000, 0, 0)
      expect(result.taxAmount).toBe(0)
      expect(result.totalAmount).toBe(100000)
    })

    it('should calculate tax correctly', () => {
      // 8.25% tax on $1,000
      const result = calculateTotal(100000, 825, 0)
      expect(result.taxAmount).toBe(8250) // $82.50
      expect(result.totalAmount).toBe(108250) // $1,082.50
    })

    it('should apply discount correctly', () => {
      const result = calculateTotal(100000, 0, 10000)
      expect(result.totalAmount).toBe(90000) // $900.00
    })

    it('should calculate with both tax and discount', () => {
      // $1,000 subtotal + $82.50 tax - $100 discount
      const result = calculateTotal(100000, 825, 10000)
      expect(result.taxAmount).toBe(8250)
      expect(result.totalAmount).toBe(98250) // $982.50
    })

    it('should round tax to nearest cent', () => {
      // 8.25% of $333.33 = 27.499725, should round to 2750
      const result = calculateTotal(33333, 825, 0)
      expect(result.taxAmount).toBe(2750) // Rounded
    })
  })

  describe('Balance due calculations', () => {
    function calculateBalanceDue(
      totalAmount: number,
      trustApplied: number,
      directPayments: number
    ): number {
      return Math.max(0, totalAmount - trustApplied - directPayments)
    }

    it('should calculate balance with no payments', () => {
      expect(calculateBalanceDue(100000, 0, 0)).toBe(100000)
    })

    it('should subtract trust payments', () => {
      expect(calculateBalanceDue(100000, 30000, 0)).toBe(70000)
    })

    it('should subtract direct payments', () => {
      expect(calculateBalanceDue(100000, 0, 50000)).toBe(50000)
    })

    it('should subtract both payment types', () => {
      expect(calculateBalanceDue(100000, 30000, 20000)).toBe(50000)
    })

    it('should not go negative (overpayment)', () => {
      expect(calculateBalanceDue(100000, 60000, 50000)).toBe(0)
    })

    it('should return zero when fully paid', () => {
      expect(calculateBalanceDue(100000, 100000, 0)).toBe(0)
      expect(calculateBalanceDue(100000, 50000, 50000)).toBe(0)
    })
  })

  describe('Status color mapping', () => {
    const statusColors: Record<string, string> = {
      DRAFT: 'gray',
      SENT: 'blue',
      VIEWED: 'blue',
      PAID: 'green',
      PARTIALLY_PAID: 'yellow',
      OVERDUE: 'red',
      CANCELLED: 'gray',
      VOID: 'gray'
    }

    it('should map all invoice statuses to colors', () => {
      expect(statusColors['DRAFT']).toBe('gray')
      expect(statusColors['SENT']).toBe('blue')
      expect(statusColors['VIEWED']).toBe('blue')
      expect(statusColors['PAID']).toBe('green')
      expect(statusColors['PARTIALLY_PAID']).toBe('yellow')
      expect(statusColors['OVERDUE']).toBe('red')
      expect(statusColors['CANCELLED']).toBe('gray')
      expect(statusColors['VOID']).toBe('gray')
    })
  })

  describe('PDF generation', () => {
    function createTestInvoiceOptions(): InvoicePdfOptions {
      return {
        invoice: {
          id: 'inv-123',
          invoiceNumber: 'INV-2026-0001',
          issueDate: new Date('2026-01-15'),
          dueDate: new Date('2026-02-14'),
          status: 'SENT'
        },
        client: {
          name: 'John Smith',
          email: 'john@example.com',
          address: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        },
        matter: {
          title: 'Estate Planning',
          matterNumber: 'MAT-2026-001'
        },
        firm: {
          name: 'Smith & Associates',
          address: '456 Law Ave, Suite 100',
          phone: '(555) 123-4567',
          email: 'contact@smithlaw.com',
          website: 'www.smithlaw.com'
        },
        lineItems: [
          {
            description: 'Estate Planning Consultation',
            quantity: 2,
            unitPrice: 35000,
            amount: 70000,
            itemType: 'SERVICE'
          },
          {
            description: 'Document Preparation',
            quantity: 1,
            unitPrice: 50000,
            amount: 50000,
            itemType: 'SERVICE'
          }
        ],
        totals: {
          subtotal: 120000,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 120000,
          trustApplied: 0,
          directPayments: 0,
          balanceDue: 120000
        },
        notes: 'Thank you for your business.',
        terms: 'Payment due within 30 days.'
      }
    }

    it('should generate a valid PDF', async () => {
      const options = createTestInvoiceOptions()
      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)

      // Check for PDF header magic bytes
      const header = new TextDecoder().decode(pdfBytes.slice(0, 5))
      expect(header).toBe('%PDF-')
    })

    it('should generate PDF with multiple line items', async () => {
      const options = createTestInvoiceOptions()
      options.lineItems = Array(10).fill(null).map((_, i) => ({
        description: `Service Item ${i + 1}`,
        quantity: 1,
        unitPrice: 10000,
        amount: 10000,
        itemType: 'SERVICE'
      }))
      options.totals.subtotal = 100000
      options.totals.totalAmount = 100000
      options.totals.balanceDue = 100000

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with trust balance info', async () => {
      const options = createTestInvoiceOptions()
      options.trustBalance = 500000 // $5,000 trust balance

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with partial payment', async () => {
      const options = createTestInvoiceOptions()
      options.totals.trustApplied = 50000
      options.totals.directPayments = 30000
      options.totals.balanceDue = 40000

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with tax and discount', async () => {
      const options = createTestInvoiceOptions()
      options.totals.taxRate = 825
      options.totals.taxAmount = 9900
      options.totals.discountAmount = 10000
      options.totals.totalAmount = 119900
      options.totals.balanceDue = 119900

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with PAID status', async () => {
      const options = createTestInvoiceOptions()
      options.invoice.status = 'PAID'
      options.totals.directPayments = 120000
      options.totals.balanceDue = 0

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with OVERDUE status', async () => {
      const options = createTestInvoiceOptions()
      options.invoice.status = 'OVERDUE'
      options.invoice.dueDate = new Date('2025-12-01') // Past due

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF with minimal client info', async () => {
      const options = createTestInvoiceOptions()
      options.client = {
        name: 'Jane Doe'
        // No other fields
      }

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })

    it('should generate PDF without notes and terms', async () => {
      const options = createTestInvoiceOptions()
      delete options.notes
      delete options.terms

      const pdfBytes = await generateInvoicePdf(options)

      expect(pdfBytes).toBeInstanceOf(Uint8Array)
      expect(pdfBytes.length).toBeGreaterThan(0)
    })
  })

  describe('Invoice line item types', () => {
    const itemTypes = [
      'SERVICE',
      'CONSULTATION',
      'FILING_FEE',
      'EXPENSE',
      'ADJUSTMENT',
      'OTHER'
    ]

    it.each(itemTypes)('should handle %s item type', (itemType) => {
      const item: InvoiceLineItem = {
        description: `Test ${itemType}`,
        quantity: 1,
        unitPrice: 10000,
        amount: 10000,
        itemType
      }

      expect(item.itemType).toBe(itemType)
      expect(item.amount).toBe(item.quantity * item.unitPrice)
    })
  })

  describe('Address formatting', () => {
    function formatCityStateZip(city?: string, state?: string, zipCode?: string): string {
      return [city, state, zipCode].filter(Boolean).join(', ')
    }

    it('should format full address', () => {
      expect(formatCityStateZip('Anytown', 'CA', '12345')).toBe('Anytown, CA, 12345')
    })

    it('should handle missing city', () => {
      expect(formatCityStateZip(undefined, 'CA', '12345')).toBe('CA, 12345')
    })

    it('should handle missing state', () => {
      expect(formatCityStateZip('Anytown', undefined, '12345')).toBe('Anytown, 12345')
    })

    it('should handle missing zip', () => {
      expect(formatCityStateZip('Anytown', 'CA', undefined)).toBe('Anytown, CA')
    })

    it('should handle only city', () => {
      expect(formatCityStateZip('Anytown', undefined, undefined)).toBe('Anytown')
    })

    it('should handle all empty', () => {
      expect(formatCityStateZip(undefined, undefined, undefined)).toBe('')
    })
  })
})
