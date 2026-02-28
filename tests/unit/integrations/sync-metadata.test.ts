/**
 * Tests for Sync Metadata Utilities
 *
 * Tests the exported pure functions from server/utils/sync-metadata.ts directly.
 * The DB-dependent markFieldsAsLocallyModified is tested by simulating its
 * detectChangedFields logic inline.
 */

import { describe, it, expect } from 'vitest'
import { isImportedRecord, getLocallyModifiedFields } from '../../../server/utils/sync-metadata'
import type { ImportMetadata } from '../../../server/utils/lawmatics-transformers'

// ===================================
// Simulate detectChangedFields (private in sync-metadata.ts)
// ===================================

function detectChangedFields(
  existing: Record<string, any>,
  incoming: Record<string, any>,
  fieldNames: string[]
): string[] {
  const changed: string[] = []
  for (const field of fieldNames) {
    const existingVal = existing[field]
    const incomingVal = incoming[field]

    const normalizeVal = (v: any) => {
      if (v === undefined || v === null || v === '') return null
      if (v instanceof Date) return v.getTime()
      return v
    }

    if (normalizeVal(existingVal) !== normalizeVal(incomingVal)) {
      changed.push(field)
    }
  }
  return changed
}

// ===================================
// Tests: isImportedRecord
// ===================================

describe('Sync Metadata - isImportedRecord', () => {
  it('returns false for null', () => {
    expect(isImportedRecord(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isImportedRecord(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isImportedRecord('')).toBe(false)
  })

  it('returns false for invalid JSON', () => {
    expect(isImportedRecord('not json')).toBe(false)
    expect(isImportedRecord('{broken}')).toBe(false)
  })

  it('returns false for JSON without source field', () => {
    expect(isImportedRecord(JSON.stringify({ externalId: '123' }))).toBe(false)
  })

  it('returns false for JSON with empty string source', () => {
    expect(isImportedRecord(JSON.stringify({ source: '' }))).toBe(false)
  })

  it('returns true for JSON with source set to LAWMATICS', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    expect(isImportedRecord(JSON.stringify(meta))).toBe(true)
  })

  it('returns true for JSON with source set to WEALTHCOUNSEL', () => {
    const meta: ImportMetadata = {
      source: 'WEALTHCOUNSEL',
      externalId: 'wc-1',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    expect(isImportedRecord(JSON.stringify(meta))).toBe(true)
  })

  it('returns true even when sourceOfTruth is YTP', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      sourceOfTruth: 'YTP'
    }
    expect(isImportedRecord(JSON.stringify(meta))).toBe(true)
  })
})

// ===================================
// Tests: getLocallyModifiedFields
// ===================================

describe('Sync Metadata - getLocallyModifiedFields', () => {
  it('returns empty array for null', () => {
    expect(getLocallyModifiedFields(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(getLocallyModifiedFields(undefined)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(getLocallyModifiedFields('')).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(getLocallyModifiedFields('not json')).toEqual([])
  })

  it('returns empty array when locallyModifiedFields is missing', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    expect(getLocallyModifiedFields(JSON.stringify(meta))).toEqual([])
  })

  it('returns empty array when locallyModifiedFields is empty', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: []
    }
    expect(getLocallyModifiedFields(JSON.stringify(meta))).toEqual([])
  })

  it('returns the array when locallyModifiedFields is populated', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email', 'phone', 'firstName']
    }
    expect(getLocallyModifiedFields(JSON.stringify(meta))).toEqual(['email', 'phone', 'firstName'])
  })

  it('returns single-element array', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email']
    }
    expect(getLocallyModifiedFields(JSON.stringify(meta))).toEqual(['email'])
  })
})

// ===================================
// Tests: detectChangedFields (simulated)
// ===================================

describe('Sync Metadata - detectChangedFields logic', () => {
  it('detects actual value changes', () => {
    const existing = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
    const incoming = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }
    const result = detectChangedFields(existing, incoming, ['firstName', 'lastName', 'email'])

    expect(result).toEqual(['firstName', 'email'])
  })

  it('treats null and undefined as equivalent (no change)', () => {
    const existing = { firstName: null, lastName: undefined }
    const incoming = { firstName: undefined, lastName: null }
    const result = detectChangedFields(existing, incoming, ['firstName', 'lastName'])

    expect(result).toEqual([])
  })

  it('treats empty string and null as equivalent (no change)', () => {
    const existing = { email: '', phone: null }
    const incoming = { email: null, phone: '' }
    const result = detectChangedFields(existing, incoming, ['email', 'phone'])

    expect(result).toEqual([])
  })

  it('treats empty string and undefined as equivalent (no change)', () => {
    const existing = { email: '' }
    const incoming = { email: undefined }
    const result = detectChangedFields(existing, incoming, ['email'])

    expect(result).toEqual([])
  })

  it('detects change from null to a value', () => {
    const existing = { email: null }
    const incoming = { email: 'new@example.com' }
    const result = detectChangedFields(existing, incoming, ['email'])

    expect(result).toEqual(['email'])
  })

  it('detects change from a value to null', () => {
    const existing = { email: 'old@example.com' }
    const incoming = { email: null }
    const result = detectChangedFields(existing, incoming, ['email'])

    expect(result).toEqual(['email'])
  })

  it('only checks specified field names', () => {
    const existing = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
    const incoming = { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
    // Only check firstName — should not detect lastName or email changes
    const result = detectChangedFields(existing, incoming, ['firstName'])

    expect(result).toEqual(['firstName'])
  })

  it('returns empty array when nothing changed', () => {
    const existing = { firstName: 'John', email: 'john@example.com' }
    const incoming = { firstName: 'John', email: 'john@example.com' }
    const result = detectChangedFields(existing, incoming, ['firstName', 'email'])

    expect(result).toEqual([])
  })

  it('handles Date comparison', () => {
    const date1 = new Date('2025-01-01')
    const date2 = new Date('2025-01-01')
    const date3 = new Date('2025-06-15')

    // Same dates
    expect(detectChangedFields(
      { dob: date1 },
      { dob: date2 },
      ['dob']
    )).toEqual([])

    // Different dates
    expect(detectChangedFields(
      { dob: date1 },
      { dob: date3 },
      ['dob']
    )).toEqual(['dob'])
  })

  it('handles numeric comparison', () => {
    const existing = { age: 30 }
    const incoming = { age: 31 }
    expect(detectChangedFields(existing, incoming, ['age'])).toEqual(['age'])

    const same = { age: 30 }
    expect(detectChangedFields(existing, same, ['age'])).toEqual([])
  })
})

// ===================================
// Tests: Field tracking integration (simulated markFieldsAsLocallyModified)
// ===================================

describe('Sync Metadata - field tracking integration', () => {
  /**
   * Simulates the merge logic from markFieldsAsLocallyModified:
   * merges new changed fields with existing locallyModifiedFields, deduplicating.
   */
  function simulateFieldTracking(
    rawMeta: string | null,
    existingRecord: Record<string, any>,
    newValues: Record<string, any>,
    trackableFields: string[]
  ): { updatedFields: string[]; changedFields: string[] } {
    if (!rawMeta) return { updatedFields: [], changedFields: [] }

    let meta: ImportMetadata
    try {
      meta = JSON.parse(rawMeta) as ImportMetadata
    } catch {
      return { updatedFields: [], changedFields: [] }
    }

    if (!meta.source) return { updatedFields: [], changedFields: [] }

    const changedFields = detectChangedFields(existingRecord, newValues, trackableFields)
    if (changedFields.length === 0) return { updatedFields: meta.locallyModifiedFields || [], changedFields: [] }

    const existingSet = new Set(meta.locallyModifiedFields || [])
    for (const field of changedFields) {
      existingSet.add(field)
    }
    const updatedFields = Array.from(existingSet)

    return { updatedFields, changedFields }
  }

  it('new changes merge with existing locally modified list', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email']
    }
    const existing = { email: 'old@example.com', phone: '555-0000' }
    const incoming = { email: 'old@example.com', phone: '555-1111' } // only phone changed
    const result = simulateFieldTracking(
      JSON.stringify(meta), existing, incoming, ['email', 'phone']
    )

    expect(result.changedFields).toEqual(['phone'])
    expect(result.updatedFields).toEqual(['email', 'phone']) // merged
  })

  it('duplicates are deduplicated', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email', 'phone']
    }
    const existing = { email: 'old@example.com', phone: '555-0000' }
    const incoming = { email: 'new@example.com', phone: '555-1111' } // both changed again
    const result = simulateFieldTracking(
      JSON.stringify(meta), existing, incoming, ['email', 'phone']
    )

    expect(result.changedFields).toEqual(['email', 'phone'])
    // Should still be ['email', 'phone'], not ['email', 'phone', 'email', 'phone']
    expect(result.updatedFields).toEqual(['email', 'phone'])
  })

  it('non-imported records return empty', () => {
    const result = simulateFieldTracking(
      null, { email: 'a@b.com' }, { email: 'c@d.com' }, ['email']
    )
    expect(result.changedFields).toEqual([])
    expect(result.updatedFields).toEqual([])
  })

  it('records without source return empty', () => {
    const noSource = JSON.stringify({ externalId: '123' })
    const result = simulateFieldTracking(
      noSource, { email: 'a@b.com' }, { email: 'c@d.com' }, ['email']
    )
    expect(result.changedFields).toEqual([])
    expect(result.updatedFields).toEqual([])
  })

  it('no actual changes returns existing list unchanged', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email']
    }
    const existing = { email: 'same@example.com', phone: '555-0000' }
    const incoming = { email: 'same@example.com', phone: '555-0000' }
    const result = simulateFieldTracking(
      JSON.stringify(meta), existing, incoming, ['email', 'phone']
    )

    expect(result.changedFields).toEqual([])
    expect(result.updatedFields).toEqual(['email'])
  })
})
