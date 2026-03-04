import { describe, it, expect } from 'vitest'
import { scoreRecordPair, applyAntiSignals, classifyMatch } from '../../../server/utils/record-matcher/scorer'
import { DEFAULT_MATCH_CONFIG } from '../../../server/utils/record-matcher/config'
import type { PersonRecord } from '../../../server/utils/record-matcher/types'

describe('scoreRecordPair', () => {
  it('scores identical records as 1.0', () => {
    const record: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '555-123-4567',
      dateOfBirth: '1990-01-15'
    }

    const { rawScore } = scoreRecordPair(record, record)
    expect(rawScore).toBeGreaterThanOrEqual(0.98)
  })

  it('scores completely different records as 0', () => {
    const a: PersonRecord = {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com'
    }
    const b: PersonRecord = {
      firstName: 'Zephyr',
      lastName: 'Xanadu',
      email: 'zephyr@different.com'
    }

    const { rawScore } = scoreRecordPair(a, b)
    expect(rawScore).toBe(0)
  })

  it('handles missing fields by redistributing weight', () => {
    // When DOB is missing from both, the other fields should still
    // produce a meaningful score without the DOB weight tanking it
    const a: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }

    const { rawScore } = scoreRecordPair(a, b)
    expect(rawScore).toBe(1.0) // All present fields match perfectly
  })

  it('produces intermediate scores for partial matches', () => {
    const a: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }
    const b: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@different.com' // Different email
    }

    const { rawScore } = scoreRecordPair(a, b)
    expect(rawScore).toBeGreaterThan(0)
    expect(rawScore).toBeLessThan(1.0)
  })
})

describe('applyAntiSignals', () => {
  it('penalizes shared email with different first name (spouse signal)', () => {
    const input: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'smiths@example.com'
    }
    const candidate: PersonRecord = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'smiths@example.com'
    }

    const { rawScore, fieldScores } = scoreRecordPair(input, candidate)
    const { adjustedScore, antiSignals } = applyAntiSignals(input, candidate, rawScore, fieldScores)

    // Should have shared_email_different_name anti-signal
    expect(antiSignals).toHaveLength(1)
    expect(antiSignals[0].type).toBe('shared_email_different_name')
    expect(adjustedScore).toBeLessThan(rawScore)
  })

  it('does not penalize same email with same first name', () => {
    const input: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }
    const candidate: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com'
    }

    const { rawScore, fieldScores } = scoreRecordPair(input, candidate)
    const { adjustedScore, antiSignals } = applyAntiSignals(input, candidate, rawScore, fieldScores)

    expect(antiSignals).toHaveLength(0)
    expect(adjustedScore).toBe(rawScore)
  })

  it('penalizes different DOB', () => {
    const input: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1990-01-15'
    }
    const candidate: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1985-07-22'
    }

    const { rawScore, fieldScores } = scoreRecordPair(input, candidate)
    const { antiSignals } = applyAntiSignals(input, candidate, rawScore, fieldScores)

    const dobAntiSignal = antiSignals.find(s => s.type === 'different_dob')
    expect(dobAntiSignal).toBeDefined()
  })

  it('gives definitive non-match for different SSN', () => {
    const input: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      ssnLast4: '1234'
    }
    const candidate: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      ssnLast4: '5678'
    }

    const { rawScore, fieldScores } = scoreRecordPair(input, candidate)
    const { adjustedScore, antiSignals } = applyAntiSignals(input, candidate, rawScore, fieldScores)

    const ssnAntiSignal = antiSignals.find(s => s.type === 'different_ssn')
    expect(ssnAntiSignal).toBeDefined()
    expect(adjustedScore).toBe(0)
  })

  it('applies known spouse penalty', () => {
    const input: PersonRecord = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'smiths@example.com'
    }
    const candidate: PersonRecord = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'smiths@example.com'
    }

    const { rawScore, fieldScores } = scoreRecordPair(input, candidate)
    const spouseIds = new Set(['person_jane'])
    const { adjustedScore, antiSignals } = applyAntiSignals(
      input, candidate, rawScore, fieldScores,
      DEFAULT_MATCH_CONFIG, spouseIds, 'person_jane'
    )

    const spouseAntiSignal = antiSignals.find(s => s.type === 'known_spouse')
    expect(spouseAntiSignal).toBeDefined()
    expect(adjustedScore).toBe(0)
  })
})

describe('classifyMatch', () => {
  it('classifies high confidence', () => {
    expect(classifyMatch(0.90)).toBe('high')
    expect(classifyMatch(0.85)).toBe('high')
  })

  it('classifies medium confidence', () => {
    expect(classifyMatch(0.75)).toBe('medium')
    expect(classifyMatch(0.60)).toBe('medium')
  })

  it('classifies low confidence', () => {
    expect(classifyMatch(0.50)).toBe('low')
    expect(classifyMatch(0.10)).toBe('low')
    expect(classifyMatch(0)).toBe('low')
  })
})
