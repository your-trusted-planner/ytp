/**
 * TDD Tests for server/utils/phone.ts
 *
 * Phone number formatting and validation for SMS delivery.
 * Must produce E.164 format for the Zoom Phone API.
 */

import { describe, it, expect } from 'vitest'
import { formatE164, isValidE164 } from '../../../server/utils/phone'

describe('Phone Number Utilities', () => {
  describe('formatE164', () => {
    it('formats a 10-digit US number', () => {
      expect(formatE164('5551234567')).toBe('+15551234567')
    })

    it('formats a punctuated 10-digit US number', () => {
      expect(formatE164('(555) 123-4567')).toBe('+15551234567')
    })

    it('formats a dashed 10-digit US number', () => {
      expect(formatE164('555-123-4567')).toBe('+15551234567')
    })

    it('formats a dotted 10-digit US number', () => {
      expect(formatE164('555.123.4567')).toBe('+15551234567')
    })

    it('formats an 11-digit number with US country code', () => {
      expect(formatE164('15551234567')).toBe('+15551234567')
    })

    it('formats a number that already has country code with plus', () => {
      expect(formatE164('+15551234567')).toBe('+15551234567')
    })

    it('strips whitespace', () => {
      expect(formatE164('  555 123 4567  ')).toBe('+15551234567')
    })

    it('returns null for empty input', () => {
      expect(formatE164('')).toBeNull()
      expect(formatE164('   ')).toBeNull()
    })

    it('returns null for null/undefined input', () => {
      expect(formatE164(null)).toBeNull()
      expect(formatE164(undefined)).toBeNull()
    })

    it('returns null for a number with too few digits', () => {
      expect(formatE164('555123')).toBeNull()
    })

    it('returns null for a number with too many digits (non-international)', () => {
      expect(formatE164('555123456789')).toBeNull()
    })

    it('returns null for non-numeric input', () => {
      expect(formatE164('not a phone number')).toBeNull()
    })

    it('preserves international numbers in E.164 form', () => {
      // UK mobile in E.164
      expect(formatE164('+447911123456')).toBe('+447911123456')
    })

    it('does not accept 10-digit numbers starting with 0 or 1', () => {
      // In NANP, area codes can't start with 0 or 1
      expect(formatE164('0551234567')).toBeNull()
      expect(formatE164('1551234567')).toBeNull()
    })
  })

  describe('isValidE164', () => {
    it('accepts a well-formed US E.164 number', () => {
      expect(isValidE164('+15551234567')).toBe(true)
    })

    it('accepts a well-formed international E.164 number', () => {
      expect(isValidE164('+447911123456')).toBe(true)
    })

    it('rejects a number without leading plus', () => {
      expect(isValidE164('15551234567')).toBe(false)
    })

    it('rejects a number with punctuation', () => {
      expect(isValidE164('+1 (555) 123-4567')).toBe(false)
    })

    it('rejects an empty string', () => {
      expect(isValidE164('')).toBe(false)
    })

    it('rejects null/undefined', () => {
      expect(isValidE164(null as any)).toBe(false)
      expect(isValidE164(undefined as any)).toBe(false)
    })

    it('rejects too-short numbers', () => {
      expect(isValidE164('+1555')).toBe(false)
    })
  })
})
