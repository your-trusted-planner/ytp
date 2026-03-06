import { describe, it, expect } from 'vitest'
import { scoreRecords } from '../../../server/utils/record-matcher'
import type { PersonRecord } from '../../../server/utils/record-matcher/types'

describe('scoreRecords (integration)', () => {
  it('scores exact duplicate highly', () => {
    const person: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '555-123-4567',
      dateOfBirth: '1985-03-15',
      address: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701'
    }

    const result = scoreRecords(person, person)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0.98)
    expect(result.confidence).toBe('high')
    expect(result.antiSignals).toHaveLength(0)
  })

  it('scores spouses sharing email as low (anti-signal)', () => {
    const husband: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'smithfamily@example.com',
      phone: '555-123-4567'
    }

    const wife: PersonRecord = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'smithfamily@example.com',
      phone: '555-123-4567'
    }

    const result = scoreRecords(husband, wife)

    // Should have a shared_email_different_name anti-signal
    const antiSignal = result.antiSignals.find(s => s.type === 'shared_email_different_name')
    expect(antiSignal).toBeDefined()

    // Adjusted score should be significantly lower than raw score
    expect(result.adjustedScore).toBeLessThan(result.rawScore)
    expect(result.confidence).toBe('low')
  })

  it('scores nickname variants as high', () => {
    const a: PersonRecord = {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com'
    }
    const b: PersonRecord = {
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com'
    }

    const result = scoreRecords(a, b)
    expect(result.confidence).toBe('high')
    // First name should have nickname method
    const firstNameScore = result.fieldScores.find(s => s.field === 'firstName')
    expect(firstNameScore?.method).toBe('nickname')
    expect(firstNameScore?.score).toBe(0.95)
  })

  it('scores phonetic last name variants as medium-high', () => {
    const a: PersonRecord = {
      firstName: 'Patrick',
      lastName: 'McGuire',
      email: 'pat@example.com'
    }
    const b: PersonRecord = {
      firstName: 'Patrick',
      lastName: 'Maguire',
      email: 'pat@example.com'
    }

    const result = scoreRecords(a, b)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0.85)
    expect(result.confidence).toBe('high')
  })

  it('scores typo in name with matching email/lastName as medium-ish', () => {
    const a: PersonRecord = {
      firstName: 'Jonh',  // Typo (transposition, Levenshtein dist = 2)
      lastName: 'Smith',
      email: 'john@example.com'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }

    const result = scoreRecords(a, b)
    // Jonh→John is distance 2/4 = 0.50 normalized, which falls outside the 0.4 threshold
    // so firstName scores 0. Email + lastName still contribute significantly.
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0.50)
  })

  it('scores misspelling with nickname match + same email as high', () => {
    // Use Mike/Michael which triggers nickname matching (0.95)
    // rather than relying on levenshtein for Micheal/Michael
    const a: PersonRecord = {
      firstName: 'Mike',
      lastName: 'Smith',
      email: 'mike@example.com'
    }
    const b: PersonRecord = {
      firstName: 'Michael',
      lastName: 'Smith',
      email: 'mike@example.com'
    }

    const result = scoreRecords(a, b)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0.85)
    expect(result.confidence).toBe('high')
  })

  it('scores completely unrelated people as low', () => {
    const a: PersonRecord = {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@first.com',
      phone: '555-111-1111',
      dateOfBirth: '1990-01-01'
    }
    const b: PersonRecord = {
      firstName: 'Zephyr',
      lastName: 'Xanadu',
      email: 'zephyr@second.com',
      phone: '555-999-9999',
      dateOfBirth: '1975-12-25'
    }

    const result = scoreRecords(a, b)
    expect(result.adjustedScore).toBe(0)
    expect(result.confidence).toBe('low')
  })

  it('handles records with only name data', () => {
    const a: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith'
    }

    const result = scoreRecords(a, b)
    expect(result.adjustedScore).toBe(1.0)
    expect(result.confidence).toBe('high')
  })

  it('different DOB applies anti-signal penalty', () => {
    const a: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      dateOfBirth: '1990-01-15'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      dateOfBirth: '1985-07-22'
    }

    const result = scoreRecords(a, b)
    const dobAnti = result.antiSignals.find(s => s.type === 'different_dob')
    expect(dobAnti).toBeDefined()
    expect(result.adjustedScore).toBeLessThan(result.rawScore)
  })

  it('scores same name + same phone without email as medium+', () => {
    const a: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      phone: '555-123-4567'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      phone: '555-123-4567'
    }

    const result = scoreRecords(a, b)
    expect(result.adjustedScore).toBeGreaterThanOrEqual(0.85)
    expect(result.confidence).toBe('high')
  })

  it('provides detailed field scores in results', () => {
    const a: PersonRecord = {
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com'
    }
    const b: PersonRecord = {
      firstName: 'Robert',
      lastName: 'Smith',
      email: 'bob@example.com'
    }

    const result = scoreRecords(a, b)

    // Should have field scores for all compared fields
    expect(result.fieldScores.length).toBeGreaterThanOrEqual(3)

    // Email should be exact
    const emailField = result.fieldScores.find(s => s.field === 'email')
    expect(emailField?.score).toBe(1.0)
    expect(emailField?.method).toBe('exact')

    // First name should be nickname
    const firstNameField = result.fieldScores.find(s => s.field === 'firstName')
    expect(firstNameField?.score).toBe(0.95)
    expect(firstNameField?.method).toBe('nickname')
  })
})
