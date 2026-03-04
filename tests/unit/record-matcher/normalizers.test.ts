import { describe, it, expect } from 'vitest'
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  extractPhoneDigits,
  normalizeAddress
} from '../../../server/utils/record-matcher/normalizers'

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  John@Example.COM  ')).toBe('john@example.com')
  })

  it('returns null for empty input', () => {
    expect(normalizeEmail('')).toBeNull()
  })

  it('returns null for placeholder emails', () => {
    expect(normalizeEmail('lawmatics.123@imported.local')).toBeNull()
    expect(normalizeEmail('test@placeholder.local')).toBeNull()
  })

  it('preserves valid emails', () => {
    expect(normalizeEmail('jane.doe@gmail.com')).toBe('jane.doe@gmail.com')
  })
})

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  John  ')).toBe('john')
  })

  it('strips accents', () => {
    expect(normalizeName('José')).toBe('jose')
    expect(normalizeName('François')).toBe('francois')
    expect(normalizeName('Müller')).toBe('muller')
  })

  it('strips titles', () => {
    expect(normalizeName('Mr. John')).toBe('john')
    expect(normalizeName('Mrs. Jane')).toBe('jane')
    expect(normalizeName('Dr. Smith')).toBe('smith')
    expect(normalizeName('John Jr.')).toBe('john')
    expect(normalizeName('James III')).toBe('james')
  })

  it('collapses whitespace', () => {
    expect(normalizeName('Mary  Ann')).toBe('mary ann')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeName('')).toBe('')
  })
})

describe('normalizePhone', () => {
  it('normalizes US numbers to E.164', () => {
    // Uses libphonenumber-js for valid numbers, falls back to digit extraction
    const result1 = normalizePhone('(555) 123-4567')
    expect(result1).toBeTruthy()
    expect(result1).toContain('5551234567')

    const result2 = normalizePhone('555-123-4567')
    expect(result2).toBeTruthy()
    expect(result2).toContain('5551234567')

    const result3 = normalizePhone('5551234567')
    expect(result3).toBeTruthy()
    expect(result3).toContain('5551234567')
  })

  it('normalizes valid US numbers to E.164', () => {
    // 212 is a valid NYC area code
    expect(normalizePhone('(212) 555-1234')).toBe('+12125551234')
    expect(normalizePhone('+1 212 555 1234')).toBe('+12125551234')
  })

  it('returns null for unparseable input', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('abc')).toBeNull()
    expect(normalizePhone('123')).toBeNull()
  })
})

describe('extractPhoneDigits', () => {
  it('extracts last N digits', () => {
    expect(extractPhoneDigits('(555) 123-4567', 10)).toBe('5551234567')
    expect(extractPhoneDigits('+1-555-123-4567', 7)).toBe('1234567')
  })

  it('returns null for short numbers', () => {
    expect(extractPhoneDigits('123', 10)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(extractPhoneDigits('', 10)).toBeNull()
  })
})

describe('normalizeAddress', () => {
  it('lowercases and trims', () => {
    expect(normalizeAddress('  123 Main ST  ')).toBe('123 main street')
  })

  it('expands abbreviations', () => {
    expect(normalizeAddress('123 Main St')).toBe('123 main street')
    expect(normalizeAddress('456 Oak Ave')).toBe('456 oak avenue')
    expect(normalizeAddress('789 Elm Blvd')).toBe('789 elm boulevard')
    expect(normalizeAddress('Apt 4B')).toBe('apartment 4b')
  })

  it('removes periods and hash signs', () => {
    expect(normalizeAddress('123 Main St. #4')).toBe('123 main street 4')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeAddress('')).toBe('')
  })
})
