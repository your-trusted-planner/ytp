/**
 * Tests for Person Matching Utilities
 *
 * Tests the reusable person matching, confidence calculation,
 * and decision handling utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMatchConfidence,
  buildDecisionLookup,
  buildPersonIdLookupFromDecisions,
  shouldCreatePerson,
  PersonExtractor,
  isHighConfidenceMatch,
  hasExactMatch,
  getBestMatch,
  formatMatchType,
  getConfidenceLabel,
  DEFAULT_CONFIDENCE_SCORES,
  type PersonMatch,
  type PersonMatchDecision
} from '../../../server/utils/person-matching'

// ===================================
// CONFIDENCE CALCULATION TESTS
// ===================================

describe('calculateMatchConfidence', () => {
  describe('match type determination', () => {
    it('returns SSN match type for SSN match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', ssn: '1234' },
        { fullName: 'John Smith', ssnLast4: '1234' }
      )

      expect(result?.matchType).toBe('SSN')
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE_SCORES.SSN)
      expect(result?.matchingFields).toContain('ssn')
    })

    it('returns NAME_EMAIL for name + email match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'john@example.com' },
        { fullName: 'John Smith', email: 'john@example.com' }
      )

      expect(result?.matchType).toBe('NAME_EMAIL')
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE_SCORES.NAME_EMAIL)
      expect(result?.matchingFields).toContain('name')
      expect(result?.matchingFields).toContain('email')
    })

    it('returns NAME_DOB for name + date of birth match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', dateOfBirth: '1970-01-15' },
        { fullName: 'John Smith', dateOfBirth: '1970-01-15' }
      )

      expect(result?.matchType).toBe('NAME_DOB')
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE_SCORES.NAME_DOB)
      expect(result?.matchingFields).toContain('name')
      expect(result?.matchingFields).toContain('dateOfBirth')
    })

    it('returns NAME_EMAIL with lower confidence for email-only match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'john@example.com' },
        { fullName: 'Jonathan Smith', email: 'john@example.com' }
      )

      expect(result?.matchType).toBe('NAME_EMAIL')
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE_SCORES.EMAIL_ONLY)
      expect(result?.matchingFields).toContain('email')
      expect(result?.matchingFields).not.toContain('name')
    })

    it('returns NAME_ONLY for name-only match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith' },
        { fullName: 'John Smith', email: 'different@email.com' }
      )

      expect(result?.matchType).toBe('NAME_ONLY')
      expect(result?.confidence).toBe(DEFAULT_CONFIDENCE_SCORES.NAME_ONLY)
      expect(result?.matchingFields).toContain('name')
    })

    it('returns null for no match', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'john@example.com' },
        { fullName: 'Jane Doe', email: 'jane@example.com' }
      )

      expect(result).toBeNull()
    })

    it('returns null for DOB-only match without name', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', dateOfBirth: '1970-01-15' },
        { fullName: 'Jane Doe', dateOfBirth: '1970-01-15' }
      )

      expect(result).toBeNull()
    })
  })

  describe('case sensitivity', () => {
    it('matches names case-insensitively', () => {
      const result = calculateMatchConfidence(
        { name: 'JOHN SMITH' },
        { fullName: 'john smith' }
      )

      expect(result?.matchType).toBe('NAME_ONLY')
      expect(result?.matchingFields).toContain('name')
    })

    it('matches emails case-insensitively', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'JOHN@EXAMPLE.COM' },
        { fullName: 'John Smith', email: 'john@example.com' }
      )

      expect(result?.matchType).toBe('NAME_EMAIL')
      expect(result?.matchingFields).toContain('email')
    })
  })

  describe('name fallback', () => {
    it('uses firstName + lastName when fullName is not set', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith' },
        { firstName: 'John', lastName: 'Smith', fullName: null }
      )

      expect(result?.matchType).toBe('NAME_ONLY')
      expect(result?.personName).toBe('John Smith')
    })
  })

  describe('SSN matching', () => {
    it('matches last 4 digits of SSN', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', ssn: '123-45-6789' },
        { fullName: 'John Smith', ssnLast4: '6789' }
      )

      expect(result?.matchType).toBe('SSN')
      expect(result?.matchingFields).toContain('ssn')
    })

    it('SSN takes priority over other match types', () => {
      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'john@example.com', ssn: '1234' },
        { fullName: 'John Smith', email: 'john@example.com', ssnLast4: '1234' }
      )

      expect(result?.matchType).toBe('SSN')
    })
  })

  describe('custom confidence scores', () => {
    it('uses custom confidence scores when provided', () => {
      const customScores = {
        SSN: 100,
        NAME_EMAIL: 90,
        NAME_DOB: 80,
        EMAIL_ONLY: 70,
        NAME_ONLY: 50
      }

      const result = calculateMatchConfidence(
        { name: 'John Smith', email: 'john@example.com' },
        { fullName: 'John Smith', email: 'john@example.com' },
        customScores
      )

      expect(result?.confidence).toBe(90)
    })
  })
})

// ===================================
// DECISION HANDLING TESTS
// ===================================

describe('buildDecisionLookup', () => {
  it('builds lookup from decisions array', () => {
    const decisions: PersonMatchDecision[] = [
      { extractedName: 'John Smith', action: 'use_existing', existingPersonId: 'person_123' },
      { extractedName: 'Jane Doe', action: 'create_new' }
    ]

    const lookup = buildDecisionLookup(decisions)

    expect(lookup.get('John Smith')).toEqual({
      action: 'use_existing',
      existingPersonId: 'person_123'
    })
    expect(lookup.get('Jane Doe')).toEqual({
      action: 'create_new',
      existingPersonId: undefined
    })
  })

  it('returns empty map for empty array', () => {
    const lookup = buildDecisionLookup([])
    expect(lookup.size).toBe(0)
  })
})

describe('buildPersonIdLookupFromDecisions', () => {
  it('only includes use_existing decisions with personId', () => {
    const decisions: PersonMatchDecision[] = [
      { extractedName: 'John Smith', action: 'use_existing', existingPersonId: 'person_123' },
      { extractedName: 'Jane Doe', action: 'create_new' },
      { extractedName: 'Bob Wilson', action: 'use_existing', existingPersonId: 'person_456' }
    ]

    const lookup = buildPersonIdLookupFromDecisions(decisions)

    expect(lookup.size).toBe(2)
    expect(lookup.get('John Smith')).toBe('person_123')
    expect(lookup.get('Bob Wilson')).toBe('person_456')
    expect(lookup.has('Jane Doe')).toBe(false)
  })

  it('ignores use_existing without personId', () => {
    const decisions: PersonMatchDecision[] = [
      { extractedName: 'John Smith', action: 'use_existing' } // No existingPersonId
    ]

    const lookup = buildPersonIdLookupFromDecisions(decisions)
    expect(lookup.size).toBe(0)
  })
})

describe('shouldCreatePerson', () => {
  it('returns true for create_new decision', () => {
    const decisionLookup = buildDecisionLookup([
      { extractedName: 'John Smith', action: 'create_new' }
    ])

    expect(shouldCreatePerson('John Smith', decisionLookup)).toBe(true)
  })

  it('returns false for use_existing decision', () => {
    const decisionLookup = buildDecisionLookup([
      { extractedName: 'John Smith', action: 'use_existing', existingPersonId: 'person_123' }
    ])

    expect(shouldCreatePerson('John Smith', decisionLookup)).toBe(false)
  })

  it('returns defaultToCreate when no decision exists', () => {
    const decisionLookup = buildDecisionLookup([])

    expect(shouldCreatePerson('Unknown Person', decisionLookup, true)).toBe(true)
    expect(shouldCreatePerson('Unknown Person', decisionLookup, false)).toBe(false)
  })

  it('defaults to true when defaultToCreate not specified', () => {
    const decisionLookup = buildDecisionLookup([])

    expect(shouldCreatePerson('Unknown Person', decisionLookup)).toBe(true)
  })
})

// ===================================
// PERSON EXTRACTOR TESTS
// ===================================

describe('PersonExtractor', () => {
  describe('add', () => {
    it('adds a person with basic info', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'], 'john@example.com', '1970-01-15')

      const people = extractor.getAll()
      expect(people).toHaveLength(1)
      expect(people[0].extractedName).toBe('John Smith')
      expect(people[0].extractedEmail).toBe('john@example.com')
      expect(people[0].extractedDateOfBirth).toBe('1970-01-15')
      expect(people[0].role).toBe('client')
      expect(people[0].rolesInPlan).toContain('Primary Client')
    })

    it('deduplicates by name', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])
      extractor.add('John Smith', 'fiduciary', ['Trustee']) // Same name

      expect(extractor.count).toBe(1)
    })

    it('ignores empty names', () => {
      const extractor = new PersonExtractor()
      extractor.add('', 'client', ['Primary Client'])

      expect(extractor.count).toBe(0)
    })
  })

  describe('addRole', () => {
    it('adds role to existing person', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])
      extractor.addRole('John Smith', 'Trustee')

      const person = extractor.get('John Smith')
      expect(person?.rolesInPlan).toContain('Primary Client')
      expect(person?.rolesInPlan).toContain('Trustee')
    })

    it('does not duplicate roles', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])
      extractor.addRole('John Smith', 'Primary Client') // Duplicate

      const person = extractor.get('John Smith')
      expect(person?.rolesInPlan.filter(r => r === 'Primary Client')).toHaveLength(1)
    })

    it('tracks roles for person not yet added', () => {
      const extractor = new PersonExtractor()
      extractor.addRole('John Smith', 'Trustee')
      extractor.add('John Smith', 'fiduciary', ['Financial Agent'])

      const person = extractor.get('John Smith')
      expect(person?.rolesInPlan).toContain('Trustee')
      expect(person?.rolesInPlan).toContain('Financial Agent')
    })
  })

  describe('get and has', () => {
    it('gets person by name', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])

      expect(extractor.get('John Smith')?.extractedName).toBe('John Smith')
      expect(extractor.get('Unknown')).toBeUndefined()
    })

    it('checks if person exists', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])

      expect(extractor.has('John Smith')).toBe(true)
      expect(extractor.has('Unknown')).toBe(false)
    })
  })

  describe('getByRole', () => {
    it('filters people by role', () => {
      const extractor = new PersonExtractor<'client' | 'spouse' | 'fiduciary'>()
      extractor.add('John Smith', 'client', ['Primary Client'])
      extractor.add('Jane Smith', 'spouse', ['Spouse'])
      extractor.add('Bob Wilson', 'fiduciary', ['Trustee'])

      const clients = extractor.getByRole('client')
      expect(clients).toHaveLength(1)
      expect(clients[0].extractedName).toBe('John Smith')

      const fiduciaries = extractor.getByRole('fiduciary')
      expect(fiduciaries).toHaveLength(1)
      expect(fiduciaries[0].extractedName).toBe('Bob Wilson')
    })
  })

  describe('getRoles', () => {
    it('returns all roles for a person', () => {
      const extractor = new PersonExtractor()
      extractor.add('John Smith', 'client', ['Primary Client'])
      extractor.addRole('John Smith', 'Trustee')
      extractor.addRole('John Smith', 'Financial Agent')

      const roles = extractor.getRoles('John Smith')
      expect(roles).toContain('Primary Client')
      expect(roles).toContain('Trustee')
      expect(roles).toContain('Financial Agent')
    })

    it('returns empty array for unknown person', () => {
      const extractor = new PersonExtractor()
      expect(extractor.getRoles('Unknown')).toEqual([])
    })
  })
})

// ===================================
// UTILITY FUNCTION TESTS
// ===================================

describe('isHighConfidenceMatch', () => {
  it('returns true for confidence >= threshold', () => {
    const match: PersonMatch = {
      personId: 'person_123',
      personName: 'John Smith',
      matchType: 'NAME_EMAIL',
      confidence: 95,
      matchingFields: ['name', 'email']
    }

    expect(isHighConfidenceMatch(match)).toBe(true)
    expect(isHighConfidenceMatch(match, 95)).toBe(true)
  })

  it('returns false for confidence < threshold', () => {
    const match: PersonMatch = {
      personId: 'person_123',
      personName: 'John Smith',
      matchType: 'NAME_ONLY',
      confidence: 60,
      matchingFields: ['name']
    }

    expect(isHighConfidenceMatch(match)).toBe(false)
    expect(isHighConfidenceMatch(match, 50)).toBe(true)
  })
})

describe('hasExactMatch', () => {
  it('returns true for SSN match', () => {
    const matches: PersonMatch[] = [
      {
        personId: 'person_123',
        personName: 'John Smith',
        matchType: 'SSN',
        confidence: 99,
        matchingFields: ['ssn']
      }
    ]

    expect(hasExactMatch(matches)).toBe(true)
  })

  it('returns true for NAME_EMAIL with high confidence', () => {
    const matches: PersonMatch[] = [
      {
        personId: 'person_123',
        personName: 'John Smith',
        matchType: 'NAME_EMAIL',
        confidence: 95,
        matchingFields: ['name', 'email']
      }
    ]

    expect(hasExactMatch(matches)).toBe(true)
  })

  it('returns false for NAME_EMAIL with lower confidence', () => {
    const matches: PersonMatch[] = [
      {
        personId: 'person_123',
        personName: 'John Smith',
        matchType: 'NAME_EMAIL',
        confidence: 80,
        matchingFields: ['email']
      }
    ]

    expect(hasExactMatch(matches)).toBe(false)
  })

  it('returns false for empty matches', () => {
    expect(hasExactMatch([])).toBe(false)
  })
})

describe('getBestMatch', () => {
  it('returns first match (highest confidence)', () => {
    const matches: PersonMatch[] = [
      { personId: 'p1', personName: 'A', matchType: 'NAME_EMAIL', confidence: 95, matchingFields: [] },
      { personId: 'p2', personName: 'B', matchType: 'NAME_ONLY', confidence: 60, matchingFields: [] }
    ]

    expect(getBestMatch(matches)?.personId).toBe('p1')
  })

  it('returns undefined for empty array', () => {
    expect(getBestMatch([])).toBeUndefined()
  })
})

describe('formatMatchType', () => {
  it('formats match types for display', () => {
    expect(formatMatchType('SSN')).toBe('SSN Match')
    expect(formatMatchType('NAME_EMAIL')).toBe('Name & Email')
    expect(formatMatchType('NAME_DOB')).toBe('Name & Date of Birth')
    expect(formatMatchType('NAME_ONLY')).toBe('Name Only')
  })
})

describe('getConfidenceLabel', () => {
  it('returns correct labels for confidence levels', () => {
    expect(getConfidenceLabel(95)).toBe('high')
    expect(getConfidenceLabel(85)).toBe('high')
    expect(getConfidenceLabel(75)).toBe('medium')
    expect(getConfidenceLabel(60)).toBe('medium')
    expect(getConfidenceLabel(50)).toBe('low')
    expect(getConfidenceLabel(30)).toBe('low')
  })
})
