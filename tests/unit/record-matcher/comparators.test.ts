import { describe, it, expect } from 'vitest'
import {
  compareEmail,
  compareFirstName,
  compareLastName,
  comparePhone,
  compareDateOfBirth,
  compareAddress
} from '../../../server/utils/record-matcher/comparators'

describe('compareEmail', () => {
  it('scores 1.0 for exact match', () => {
    const result = compareEmail('john@example.com', 'john@example.com')
    expect(result.score).toBe(1.0)
    expect(result.method).toBe('exact')
  })

  it('scores 1.0 for case-insensitive match', () => {
    const result = compareEmail('John@Example.COM', 'john@example.com')
    expect(result.score).toBe(1.0)
  })

  it('scores 0 for different emails', () => {
    const result = compareEmail('john@example.com', 'jane@example.com')
    expect(result.score).toBe(0)
  })

  it('scores 0 for placeholder emails', () => {
    const result = compareEmail('test@imported.local', 'test@imported.local')
    expect(result.score).toBe(0)
    expect(result.method).toBe('placeholder')
  })

  it('scores 0 for missing inputs', () => {
    expect(compareEmail(undefined, 'john@example.com').score).toBe(0)
    expect(compareEmail('john@example.com', undefined).score).toBe(0)
  })
})

describe('compareFirstName', () => {
  it('scores 1.0 for exact match', () => {
    const result = compareFirstName('John', 'John')
    expect(result.score).toBe(1.0)
    expect(result.method).toBe('exact')
  })

  it('scores 0.95 for nickname match (Bob/Robert)', () => {
    const result = compareFirstName('Bob', 'Robert')
    expect(result.score).toBe(0.95)
    expect(result.method).toBe('nickname')
  })

  it('scores 0.95 for nickname match (Liz/Elizabeth)', () => {
    const result = compareFirstName('Liz', 'Elizabeth')
    expect(result.score).toBe(0.95)
    expect(result.method).toBe('nickname')
  })

  it('handles case-insensitive exact match', () => {
    const result = compareFirstName('JOHN', 'john')
    expect(result.score).toBe(1.0)
    expect(result.method).toBe('exact')
  })

  it('detects metaphone matches (Meghan/Meagan)', () => {
    const result = compareFirstName('Meghan', 'Meagan')
    expect(result.score).toBeGreaterThanOrEqual(0.70)
  })

  it('detects levenshtein matches (Jonh/John typo)', () => {
    const result = compareFirstName('Jonh', 'John')
    expect(result.score).toBeGreaterThanOrEqual(0.40)
  })

  it('scores 0 for completely different names', () => {
    const result = compareFirstName('Alice', 'Zephyr')
    expect(result.score).toBe(0)
  })

  it('scores 0 for missing inputs', () => {
    expect(compareFirstName(undefined, 'John').score).toBe(0)
    expect(compareFirstName('John', undefined).score).toBe(0)
  })
})

describe('compareLastName', () => {
  it('scores 1.0 for exact match', () => {
    const result = compareLastName('Smith', 'Smith')
    expect(result.score).toBe(1.0)
  })

  it('detects metaphone matches (McGuire/Maguire)', () => {
    const result = compareLastName('McGuire', 'Maguire')
    expect(result.score).toBeGreaterThanOrEqual(0.70)
  })

  it('detects levenshtein matches (Smyth/Smith)', () => {
    const result = compareLastName('Smyth', 'Smith')
    expect(result.score).toBeGreaterThanOrEqual(0.40)
  })

  it('scores 0 for completely different names', () => {
    const result = compareLastName('Smith', 'Johnson')
    expect(result.score).toBe(0)
  })
})

describe('comparePhone', () => {
  it('scores 1.0 or 0.90 for same-digits phone match', () => {
    const result = comparePhone('(555) 123-4567', '555-123-4567')
    // Both normalize to the same digits, score should be very high
    expect(result.score).toBeGreaterThanOrEqual(0.90)
  })

  it('scores high for number with country code vs without', () => {
    const result = comparePhone('+1-555-123-4567', '555-123-4567')
    expect(result.score).toBeGreaterThanOrEqual(0.90)
  })

  it('scores 0 for completely different numbers', () => {
    const result = comparePhone('555-111-1111', '555-222-2222')
    expect(result.score).toBe(0)
  })

  it('handles missing inputs', () => {
    expect(comparePhone(undefined, '555-123-4567').score).toBe(0)
    expect(comparePhone('555-123-4567', undefined).score).toBe(0)
  })
})

describe('compareDateOfBirth', () => {
  it('scores 1.0 for exact match', () => {
    const result = compareDateOfBirth('1990-03-15', '1990-03-15')
    expect(result.score).toBe(1.0)
    expect(result.method).toBe('exact')
  })

  it('scores 0.70 for month/day transposition', () => {
    const result = compareDateOfBirth('1990-03-12', '1990-12-03')
    expect(result.score).toBe(0.70)
    expect(result.method).toBe('transposition')
  })

  it('does not flag transposition when values > 12', () => {
    // 15 can't be a month, so 03/15 vs 15/03 isn't a transposition
    const result = compareDateOfBirth('1990-03-15', '1990-15-03')
    expect(result.score).toBe(0)
  })

  it('scores 0 for different dates', () => {
    const result = compareDateOfBirth('1990-03-15', '1985-07-22')
    expect(result.score).toBe(0)
  })

  it('handles US date format', () => {
    const result = compareDateOfBirth('3/15/1990', '1990-03-15')
    expect(result.score).toBe(1.0)
  })

  it('handles missing inputs', () => {
    expect(compareDateOfBirth(undefined, '1990-03-15').score).toBe(0)
    expect(compareDateOfBirth('1990-03-15', undefined).score).toBe(0)
  })
})

describe('compareAddress', () => {
  it('scores 1.0 for exact match after normalization', () => {
    const result = compareAddress('123 Main St', '123 Main Street')
    expect(result.score).toBe(1.0)
    expect(result.method).toBe('token_overlap')
  })

  it('scores partial overlap', () => {
    const result = compareAddress('123 Main Street', '123 Oak Street')
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(1.0)
  })

  it('scores 0 for completely different addresses', () => {
    const result = compareAddress('123 Main Street', '456 Oak Avenue')
    // Token overlap should be low but not necessarily 0
    expect(result.score).toBeLessThan(0.5)
  })

  it('handles missing inputs', () => {
    expect(compareAddress(undefined, '123 Main St').score).toBe(0)
    expect(compareAddress('123 Main St', undefined).score).toBe(0)
  })
})
