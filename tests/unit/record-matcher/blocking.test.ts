import { describe, it, expect } from 'vitest'
import {
  generateBlockingKeys,
  buildBlockingIndex,
  getCandidateIndices
} from '../../../server/utils/record-matcher/blocking'
import type { PersonRecord } from '../../../server/utils/record-matcher/types'

describe('generateBlockingKeys', () => {
  it('generates keys for all available fields', () => {
    const record: PersonRecord = {
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '555-123-4567',
      zipCode: '90210'
    }

    const keys = generateBlockingKeys(record)
    expect(keys.length).toBeGreaterThanOrEqual(3)

    // Should include last name metaphone
    expect(keys.some(k => k.startsWith('lname_meta:'))).toBe(true)
    // Should include email
    expect(keys).toContain('email:john@example.com')
    // Should include zip
    expect(keys).toContain('zip:90210')
    // Should include phone last 7
    expect(keys.some(k => k.startsWith('phone_last7:'))).toBe(true)
  })

  it('handles records with minimal data', () => {
    const record: PersonRecord = { firstName: 'John' }
    const keys = generateBlockingKeys(record)
    expect(keys).toHaveLength(0) // firstName doesn't generate a blocking key
  })

  it('skips placeholder emails', () => {
    const record: PersonRecord = { email: 'test@imported.local' }
    const keys = generateBlockingKeys(record)
    expect(keys.filter(k => k.startsWith('email:'))).toHaveLength(0)
  })
})

describe('buildBlockingIndex', () => {
  it('maps keys to record indices', () => {
    const people: PersonRecord[] = [
      { lastName: 'Smith', email: 'john@example.com' },
      { lastName: 'Smith', email: 'jane@example.com' },
      { lastName: 'Johnson', email: 'bob@example.com' }
    ]

    const index = buildBlockingIndex(people)

    // Both Smiths should share a last name metaphone key
    const smithKey = Array.from(index.keys()).find(k => k.startsWith('lname_meta:'))
    expect(smithKey).toBeDefined()
    // The Smith metaphone key should map to indices 0 and 1
    const smithSet = index.get(smithKey!)
    expect(smithSet).toBeDefined()
    expect(smithSet!.has(0)).toBe(true)
    expect(smithSet!.has(1)).toBe(true)
  })

  it('handles empty array', () => {
    const index = buildBlockingIndex([])
    expect(index.size).toBe(0)
  })
})

describe('getCandidateIndices', () => {
  it('returns candidates sharing any blocking key', () => {
    const people: PersonRecord[] = [
      { lastName: 'Smith', email: 'john@example.com' },
      { lastName: 'Smith', email: 'jane@different.com' },
      { lastName: 'Johnson', email: 'bob@example.com' },
      { lastName: 'Williams', email: 'zoe@unrelated.com' }
    ]

    const index = buildBlockingIndex(people)

    // A query for Smith should find indices 0 and 1 (same last name metaphone)
    const candidates = getCandidateIndices(
      { lastName: 'Smith', email: 'new@query.com' },
      index
    )

    expect(candidates.has(0)).toBe(true)
    expect(candidates.has(1)).toBe(true)
    expect(candidates.has(3)).toBe(false) // Williams not a candidate
  })

  it('returns union of candidates across multiple keys', () => {
    const people: PersonRecord[] = [
      { lastName: 'Smith', email: 'shared@example.com' },
      { lastName: 'Johnson', email: 'shared@example.com' },
      { lastName: 'Williams', email: 'other@example.com' }
    ]

    const index = buildBlockingIndex(people)

    // Query matches Smith by last name AND Johnson by email
    const candidates = getCandidateIndices(
      { lastName: 'Smith', email: 'shared@example.com' },
      index
    )

    expect(candidates.has(0)).toBe(true) // Smith by last name + email
    expect(candidates.has(1)).toBe(true) // Johnson by email
  })

  it('returns empty set when no keys match', () => {
    const people: PersonRecord[] = [
      { lastName: 'Smith', email: 'john@example.com' }
    ]

    const index = buildBlockingIndex(people)

    const candidates = getCandidateIndices(
      { lastName: 'Xyzzy', email: 'nobody@nowhere.com' },
      index
    )

    expect(candidates.size).toBe(0)
  })
})
