import { describe, it, expect } from 'vitest'
import {
  isValidInvoiceNumber,
  parseInvoiceNumber
} from '../../../server/utils/invoice-number'

describe('Invoice Number Utilities', () => {
  describe('isValidInvoiceNumber', () => {
    it('should validate standard invoice numbers', () => {
      expect(isValidInvoiceNumber('INV-2026-0001')).toBe(true)
      expect(isValidInvoiceNumber('INV-2026-0123')).toBe(true)
      expect(isValidInvoiceNumber('INV-2025-9999')).toBe(true)
    })

    it('should validate invoice numbers with more than 4 digits', () => {
      expect(isValidInvoiceNumber('INV-2026-10000')).toBe(true)
      expect(isValidInvoiceNumber('INV-2026-99999')).toBe(true)
    })

    it('should reject invalid prefix', () => {
      expect(isValidInvoiceNumber('INVOICE-2026-0001')).toBe(false)
      expect(isValidInvoiceNumber('inv-2026-0001')).toBe(false)
      expect(isValidInvoiceNumber('2026-0001')).toBe(false)
    })

    it('should reject invalid year format', () => {
      expect(isValidInvoiceNumber('INV-26-0001')).toBe(false)
      expect(isValidInvoiceNumber('INV-20260-0001')).toBe(false)
      expect(isValidInvoiceNumber('INV-YYYY-0001')).toBe(false)
    })

    it('should reject sequence numbers with fewer than 4 digits', () => {
      expect(isValidInvoiceNumber('INV-2026-001')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026-01')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026-1')).toBe(false)
    })

    it('should reject empty or malformed strings', () => {
      expect(isValidInvoiceNumber('')).toBe(false)
      expect(isValidInvoiceNumber('INV')).toBe(false)
      expect(isValidInvoiceNumber('INV-')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026-')).toBe(false)
    })

    it('should reject extra characters', () => {
      expect(isValidInvoiceNumber('INV-2026-0001A')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026-0001-A')).toBe(false)
      expect(isValidInvoiceNumber(' INV-2026-0001')).toBe(false)
      expect(isValidInvoiceNumber('INV-2026-0001 ')).toBe(false)
    })
  })

  describe('parseInvoiceNumber', () => {
    it('should parse valid invoice numbers', () => {
      const result = parseInvoiceNumber('INV-2026-0001')
      expect(result).toEqual({ year: 2026, sequence: 1 })
    })

    it('should parse different years', () => {
      expect(parseInvoiceNumber('INV-2024-0001')).toEqual({ year: 2024, sequence: 1 })
      expect(parseInvoiceNumber('INV-2030-0001')).toEqual({ year: 2030, sequence: 1 })
    })

    it('should parse different sequence numbers', () => {
      expect(parseInvoiceNumber('INV-2026-0001')).toEqual({ year: 2026, sequence: 1 })
      expect(parseInvoiceNumber('INV-2026-0100')).toEqual({ year: 2026, sequence: 100 })
      expect(parseInvoiceNumber('INV-2026-9999')).toEqual({ year: 2026, sequence: 9999 })
    })

    it('should parse high sequence numbers', () => {
      expect(parseInvoiceNumber('INV-2026-10000')).toEqual({ year: 2026, sequence: 10000 })
      expect(parseInvoiceNumber('INV-2026-99999')).toEqual({ year: 2026, sequence: 99999 })
    })

    it('should strip leading zeros from sequence', () => {
      const result = parseInvoiceNumber('INV-2026-0001')
      expect(result?.sequence).toBe(1)

      const result2 = parseInvoiceNumber('INV-2026-0123')
      expect(result2?.sequence).toBe(123)
    })

    it('should return null for invalid invoice numbers', () => {
      expect(parseInvoiceNumber('')).toBeNull()
      expect(parseInvoiceNumber('invalid')).toBeNull()
      expect(parseInvoiceNumber('INV-26-0001')).toBeNull()
      // Note: parseInvoiceNumber is more lenient than isValidInvoiceNumber
      // It accepts any digit count for sequence, while validation requires 4+
      expect(parseInvoiceNumber('INVOICE-2026-0001')).toBeNull()
    })

    it('should return null for invoice numbers with extra characters', () => {
      expect(parseInvoiceNumber('INV-2026-0001A')).toBeNull()
      expect(parseInvoiceNumber(' INV-2026-0001')).toBeNull()
    })
  })

  describe('Invoice number format consistency', () => {
    it('should be parseable if valid', () => {
      // Any valid invoice number should be parseable
      const testNumbers = [
        'INV-2026-0001',
        'INV-2026-0500',
        'INV-2026-9999',
        'INV-2026-12345'
      ]

      for (const invoiceNumber of testNumbers) {
        if (isValidInvoiceNumber(invoiceNumber)) {
          expect(parseInvoiceNumber(invoiceNumber)).not.toBeNull()
        }
      }
    })

    it('should not be parseable if structurally invalid', () => {
      // Structurally invalid invoice numbers should not be parseable
      // Note: parseInvoiceNumber is more lenient on sequence length than isValidInvoiceNumber
      const structurallyInvalidNumbers = [
        'INV-26-0001',      // 2-digit year
        'INVOICE-2026-0001', // Wrong prefix
        'invalid',           // No structure
        'INV-2026',          // Missing sequence
        '',                  // Empty
      ]

      for (const invoiceNumber of structurallyInvalidNumbers) {
        expect(parseInvoiceNumber(invoiceNumber)).toBeNull()
      }
    })
  })
})
