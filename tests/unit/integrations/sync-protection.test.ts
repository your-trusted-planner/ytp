/**
 * Tests for Lawmatics Sync Protection Logic
 *
 * The 4 helper functions in lawmatics-upsert.ts (parseExistingMetadata,
 * canSyncUpdateRecord, filterLocallyModifiedFields, buildSyncedMetadata)
 * are module-private. We simulate their logic inline to verify business rules,
 * matching the pattern used in lawmatics-import-prospects.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ImportMetadata } from '../../../server/utils/lawmatics-transformers'

// ===================================
// Simulate the private helper functions
// (exact copies of the logic from lawmatics-upsert.ts)
// ===================================

function parseExistingMetadata(raw: string | null | undefined): ImportMetadata | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as ImportMetadata
  } catch {
    return null
  }
}

function canSyncUpdateRecord(existingMetadata: ImportMetadata | null, incomingSource: string): boolean {
  if (!existingMetadata) return false
  if (existingMetadata.source !== incomingSource) return false
  if (existingMetadata.sourceOfTruth === 'YTP') return false
  return true
}

function filterLocallyModifiedFields(
  updateData: Record<string, any>,
  existingMetadata: ImportMetadata | null
): { filteredData: Record<string, any>; skippedFields: string[] } {
  const locallyModified = existingMetadata?.locallyModifiedFields || []
  if (locallyModified.length === 0) {
    return { filteredData: updateData, skippedFields: [] }
  }

  const filteredData: Record<string, any> = {}
  const skippedFields: string[] = []

  for (const [key, value] of Object.entries(updateData)) {
    if (locallyModified.includes(key)) {
      skippedFields.push(key)
    } else {
      filteredData[key] = value
    }
  }

  return { filteredData, skippedFields }
}

function buildSyncedMetadata(
  existingMetadata: ImportMetadata,
  incomingValues: Record<string, any>,
  skippedFields: string[]
): string {
  const updated: ImportMetadata = {
    ...existingMetadata,
    lastSyncedAt: new Date().toISOString(),
    lastSyncSnapshot: incomingValues
  }
  return JSON.stringify(updated)
}

// ===================================
// Tests
// ===================================

describe('Sync Protection - parseExistingMetadata', () => {
  it('returns null for null input', () => {
    expect(parseExistingMetadata(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseExistingMetadata(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseExistingMetadata('')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseExistingMetadata('not json')).toBeNull()
    expect(parseExistingMetadata('{broken')).toBeNull()
  })

  it('returns parsed ImportMetadata for valid JSON', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-123',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    const result = parseExistingMetadata(JSON.stringify(meta))
    expect(result).toEqual(meta)
  })

  it('preserves all metadata fields including optional ones', () => {
    const meta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-456',
      importedAt: '2025-01-01T00:00:00.000Z',
      lastSyncedAt: '2025-06-15T12:00:00.000Z',
      sourceOfTruth: 'YTP',
      locallyModifiedFields: ['email', 'phone'],
      lastSyncSnapshot: { email: 'old@example.com' }
    }
    const result = parseExistingMetadata(JSON.stringify(meta))
    expect(result).toEqual(meta)
    expect(result!.locallyModifiedFields).toEqual(['email', 'phone'])
    expect(result!.lastSyncSnapshot).toEqual({ email: 'old@example.com' })
  })
})

describe('Sync Protection - canSyncUpdateRecord', () => {
  const lawmaticsMetadata: ImportMetadata = {
    source: 'LAWMATICS',
    externalId: 'lm-100',
    importedAt: '2025-01-01T00:00:00.000Z'
  }

  it('returns false when metadata is null (YTP-native record)', () => {
    expect(canSyncUpdateRecord(null, 'LAWMATICS')).toBe(false)
  })

  it('returns false when source does not match incoming source', () => {
    expect(canSyncUpdateRecord(lawmaticsMetadata, 'WEALTHCOUNSEL')).toBe(false)
  })

  it('returns false when source does not match (CLIO vs LAWMATICS)', () => {
    const clioMeta: ImportMetadata = {
      source: 'CLIO',
      externalId: 'clio-1',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    expect(canSyncUpdateRecord(clioMeta, 'LAWMATICS')).toBe(false)
  })

  it('returns false when sourceOfTruth is YTP', () => {
    const ytpOwned: ImportMetadata = {
      ...lawmaticsMetadata,
      sourceOfTruth: 'YTP'
    }
    expect(canSyncUpdateRecord(ytpOwned, 'LAWMATICS')).toBe(false)
  })

  it('returns true when source matches and no YTP override', () => {
    expect(canSyncUpdateRecord(lawmaticsMetadata, 'LAWMATICS')).toBe(true)
  })

  it('returns true when source matches and sourceOfTruth is LAWMATICS', () => {
    const explicitLawmatics: ImportMetadata = {
      ...lawmaticsMetadata,
      sourceOfTruth: 'LAWMATICS'
    }
    expect(canSyncUpdateRecord(explicitLawmatics, 'LAWMATICS')).toBe(true)
  })

  it('returns true even with locallyModifiedFields present (filtering is separate)', () => {
    const withLocalEdits: ImportMetadata = {
      ...lawmaticsMetadata,
      locallyModifiedFields: ['email', 'phone']
    }
    expect(canSyncUpdateRecord(withLocalEdits, 'LAWMATICS')).toBe(true)
  })
})

describe('Sync Protection - filterLocallyModifiedFields', () => {
  const incomingData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '555-1234'
  }

  it('returns all fields when no locally modified fields exist', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual(incomingData)
    expect(result.skippedFields).toEqual([])
  })

  it('returns all fields when locallyModifiedFields is empty array', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: []
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual(incomingData)
    expect(result.skippedFields).toEqual([])
  })

  it('returns all fields when metadata is null', () => {
    const result = filterLocallyModifiedFields(incomingData, null)
    expect(result.filteredData).toEqual(incomingData)
    expect(result.skippedFields).toEqual([])
  })

  it('skips fields that are in locallyModifiedFields', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email']
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '555-1234'
    })
    expect(result.skippedFields).toEqual(['email'])
  })

  it('handles partial overlap — some modified, some not', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['email', 'phone']
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual({
      firstName: 'Jane',
      lastName: 'Doe'
    })
    expect(result.skippedFields).toEqual(['email', 'phone'])
  })

  it('handles case where all fields are locally modified', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['firstName', 'lastName', 'email', 'phone']
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual({})
    expect(result.skippedFields).toEqual(['firstName', 'lastName', 'email', 'phone'])
  })

  it('ignores locally modified fields that are not in incoming data', () => {
    const metadata: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-1',
      importedAt: '2025-01-01T00:00:00.000Z',
      locallyModifiedFields: ['address', 'city'] // not in incomingData
    }
    const result = filterLocallyModifiedFields(incomingData, metadata)
    expect(result.filteredData).toEqual(incomingData)
    expect(result.skippedFields).toEqual([])
  })
})

describe('Sync Protection - buildSyncedMetadata', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-07-01T15:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets lastSyncedAt to current time', () => {
    const existingMeta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-200',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    const incoming = { firstName: 'Jane', email: 'jane@example.com' }
    const result = JSON.parse(buildSyncedMetadata(existingMeta, incoming, []))

    expect(result.lastSyncedAt).toBe('2025-07-01T15:30:00.000Z')
  })

  it('stores lastSyncSnapshot with incoming values', () => {
    const existingMeta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-200',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    const incoming = { firstName: 'Jane', email: 'jane@example.com', phone: '555-9999' }
    const result = JSON.parse(buildSyncedMetadata(existingMeta, incoming, []))

    expect(result.lastSyncSnapshot).toEqual(incoming)
  })

  it('preserves existing metadata fields', () => {
    const existingMeta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-200',
      importedAt: '2025-01-01T00:00:00.000Z',
      importRunId: 'run-abc',
      locallyModifiedFields: ['phone'],
      sourceOfTruth: 'LAWMATICS'
    }
    const incoming = { firstName: 'Jane' }
    const result = JSON.parse(buildSyncedMetadata(existingMeta, incoming, []))

    expect(result.source).toBe('LAWMATICS')
    expect(result.externalId).toBe('lm-200')
    expect(result.importedAt).toBe('2025-01-01T00:00:00.000Z')
    expect(result.importRunId).toBe('run-abc')
    expect(result.locallyModifiedFields).toEqual(['phone'])
    expect(result.sourceOfTruth).toBe('LAWMATICS')
  })

  it('overwrites previous lastSyncedAt and lastSyncSnapshot', () => {
    const existingMeta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-200',
      importedAt: '2025-01-01T00:00:00.000Z',
      lastSyncedAt: '2025-05-01T00:00:00.000Z',
      lastSyncSnapshot: { firstName: 'Old' }
    }
    const incoming = { firstName: 'New' }
    const result = JSON.parse(buildSyncedMetadata(existingMeta, incoming, []))

    expect(result.lastSyncedAt).toBe('2025-07-01T15:30:00.000Z')
    expect(result.lastSyncSnapshot).toEqual({ firstName: 'New' })
  })

  it('returns valid JSON string', () => {
    const existingMeta: ImportMetadata = {
      source: 'LAWMATICS',
      externalId: 'lm-200',
      importedAt: '2025-01-01T00:00:00.000Z'
    }
    const resultString = buildSyncedMetadata(existingMeta, { a: 1 }, [])
    expect(() => JSON.parse(resultString)).not.toThrow()
  })
})
