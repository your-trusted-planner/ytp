/**
 * End-to-End Sync Decision Flow Tests
 *
 * Combines ownership guards + field filtering + metadata building
 * in realistic scenarios. No database needed — we simulate the full
 * sync decision pipeline that lawmatics-upsert.ts performs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ImportMetadata } from '../../../server/utils/lawmatics-transformers'

// ===================================
// Simulate the sync decision pipeline
// (matches the logic in lawmatics-upsert.ts upsertPerson/upsertUser/etc.)
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
// Full sync decision simulation
// ===================================

interface SyncDecision {
  action: 'skip' | 'update'
  reason?: string
  fieldsToUpdate: Record<string, any>
  skippedFields: string[]
  updatedMetadata: string | null
}

/**
 * Simulates the complete sync decision flow for a record update.
 * This mirrors the logic in upsertPerson, upsertUser, upsertMatter.
 */
function decideSyncAction(
  existingImportMetadata: string | null | undefined,
  incomingSource: string,
  incomingFields: Record<string, any>
): SyncDecision {
  const existingMeta = parseExistingMetadata(existingImportMetadata)

  // Step 1: Ownership check
  if (!canSyncUpdateRecord(existingMeta, incomingSource)) {
    const reason = !existingMeta
      ? 'YTP-native record (no importMetadata)'
      : existingMeta.source !== incomingSource
        ? `source mismatch (record: ${existingMeta.source}, incoming: ${incomingSource})`
        : 'sourceOfTruth is YTP'
    return {
      action: 'skip',
      reason,
      fieldsToUpdate: {},
      skippedFields: Object.keys(incomingFields),
      updatedMetadata: null
    }
  }

  // Step 2: Field-level filtering
  const { filteredData, skippedFields } = filterLocallyModifiedFields(incomingFields, existingMeta)

  // Step 3: Build updated metadata (always happens even if all fields skipped)
  const updatedMetadata = buildSyncedMetadata(existingMeta!, incomingFields, skippedFields)

  return {
    action: 'update',
    fieldsToUpdate: filteredData,
    skippedFields,
    updatedMetadata
  }
}

// ===================================
// Tests
// ===================================

describe('Sync Ownership - end-to-end decision flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-07-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const incomingFields = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@lawmatics.com',
    phone: '555-1234'
  }

  describe('Record ownership scenarios', () => {
    it('YTP-native record (no importMetadata) — sync skips entirely', () => {
      const decision = decideSyncAction(null, 'LAWMATICS', incomingFields)

      expect(decision.action).toBe('skip')
      expect(decision.reason).toBe('YTP-native record (no importMetadata)')
      expect(decision.fieldsToUpdate).toEqual({})
      expect(decision.updatedMetadata).toBeNull()
    })

    it('record from different source — sync skips', () => {
      const wealthcounselMeta: ImportMetadata = {
        source: 'WEALTHCOUNSEL',
        externalId: 'wc-100',
        importedAt: '2025-01-01T00:00:00.000Z'
      }
      const decision = decideSyncAction(
        JSON.stringify(wealthcounselMeta), 'LAWMATICS', incomingFields
      )

      expect(decision.action).toBe('skip')
      expect(decision.reason).toContain('source mismatch')
      expect(decision.reason).toContain('WEALTHCOUNSEL')
      expect(decision.fieldsToUpdate).toEqual({})
    })

    it('record with sourceOfTruth: YTP — sync skips', () => {
      const ytpOwnedMeta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-100',
        importedAt: '2025-01-01T00:00:00.000Z',
        sourceOfTruth: 'YTP'
      }
      const decision = decideSyncAction(
        JSON.stringify(ytpOwnedMeta), 'LAWMATICS', incomingFields
      )

      expect(decision.action).toBe('skip')
      expect(decision.reason).toBe('sourceOfTruth is YTP')
      expect(decision.fieldsToUpdate).toEqual({})
    })
  })

  describe('Field update scenarios', () => {
    it('matching source, no local edits — all fields updated', () => {
      const lawmaticsMeta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-200',
        importedAt: '2025-01-01T00:00:00.000Z'
      }
      const decision = decideSyncAction(
        JSON.stringify(lawmaticsMeta), 'LAWMATICS', incomingFields
      )

      expect(decision.action).toBe('update')
      expect(decision.fieldsToUpdate).toEqual(incomingFields)
      expect(decision.skippedFields).toEqual([])

      // Verify metadata was updated
      const meta = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(meta.lastSyncedAt).toBe('2025-07-01T12:00:00.000Z')
      expect(meta.lastSyncSnapshot).toEqual(incomingFields)
      expect(meta.source).toBe('LAWMATICS')
      expect(meta.externalId).toBe('lm-200')
    })

    it('matching source, some local edits — locally-modified fields preserved', () => {
      const metaWithEdits: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-300',
        importedAt: '2025-01-01T00:00:00.000Z',
        locallyModifiedFields: ['email', 'phone']
      }
      const decision = decideSyncAction(
        JSON.stringify(metaWithEdits), 'LAWMATICS', incomingFields
      )

      expect(decision.action).toBe('update')
      // Only firstName and lastName should be in the update
      expect(decision.fieldsToUpdate).toEqual({
        firstName: 'Jane',
        lastName: 'Doe'
      })
      // email and phone were skipped
      expect(decision.skippedFields).toEqual(['email', 'phone'])

      // Metadata still records the full snapshot
      const meta = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(meta.lastSyncSnapshot).toEqual(incomingFields)
      expect(meta.locallyModifiedFields).toEqual(['email', 'phone'])
    })

    it('matching source, all fields locally edited — no field updates, metadata still refreshed', () => {
      const metaAllEdited: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-400',
        importedAt: '2025-01-01T00:00:00.000Z',
        locallyModifiedFields: ['firstName', 'lastName', 'email', 'phone']
      }
      const decision = decideSyncAction(
        JSON.stringify(metaAllEdited), 'LAWMATICS', incomingFields
      )

      expect(decision.action).toBe('update')
      expect(decision.fieldsToUpdate).toEqual({}) // nothing to update
      expect(decision.skippedFields).toEqual(['firstName', 'lastName', 'email', 'phone'])

      // But metadata IS still updated (sync timestamp + snapshot refreshed)
      const meta = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(meta.lastSyncedAt).toBe('2025-07-01T12:00:00.000Z')
      expect(meta.lastSyncSnapshot).toEqual(incomingFields)
    })
  })

  describe('Metadata preservation', () => {
    it('preserves importRunId through sync', () => {
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-500',
        importedAt: '2025-01-01T00:00:00.000Z',
        importRunId: 'run-original-abc'
      }
      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', incomingFields
      )

      const updated = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(updated.importRunId).toBe('run-original-abc')
    })

    it('preserves flags through sync', () => {
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-600',
        importedAt: '2025-01-01T00:00:00.000Z',
        flags: ['REVIEW_NEEDED', 'DUPLICATE_EMAIL']
      }
      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', incomingFields
      )

      const updated = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(updated.flags).toEqual(['REVIEW_NEEDED', 'DUPLICATE_EMAIL'])
    })

    it('preserves sourceData through sync', () => {
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-700',
        importedAt: '2025-01-01T00:00:00.000Z',
        sourceData: { customField: 'custom_value', rawStatus: 'active' }
      }
      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', incomingFields
      )

      const updated = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(updated.sourceData).toEqual({ customField: 'custom_value', rawStatus: 'active' })
    })
  })

  describe('Realistic multi-field scenarios', () => {
    it('person record with address fields — partial local edits', () => {
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-person-1',
        importedAt: '2025-01-01T00:00:00.000Z',
        locallyModifiedFields: ['address', 'city']
      }
      const personFields = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: '555-0000',
        address: '123 New St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201'
      }

      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', personFields
      )

      expect(decision.action).toBe('update')
      expect(decision.fieldsToUpdate).toEqual({
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: '555-0000',
        state: 'OR',
        zipCode: '97201'
      })
      expect(decision.skippedFields).toEqual(['address', 'city'])
    })

    it('matter record — title and status locally modified', () => {
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-matter-1',
        importedAt: '2025-01-01T00:00:00.000Z',
        locallyModifiedFields: ['title', 'status']
      }
      const matterFields = {
        clientId: 'client-abc',
        title: 'Smith Estate Plan',
        matterNumber: 'M-2025-001',
        description: 'Full estate plan',
        status: 'ACTIVE',
        leadAttorneyId: 'attorney-xyz'
      }

      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', matterFields
      )

      expect(decision.fieldsToUpdate).toEqual({
        clientId: 'client-abc',
        matterNumber: 'M-2025-001',
        description: 'Full estate plan',
        leadAttorneyId: 'attorney-xyz'
      })
      expect(decision.skippedFields).toEqual(['title', 'status'])
    })

    it('subsequent syncs update snapshot even when fields are protected', () => {
      // First sync established these values
      const meta: ImportMetadata = {
        source: 'LAWMATICS',
        externalId: 'lm-800',
        importedAt: '2025-01-01T00:00:00.000Z',
        lastSyncedAt: '2025-06-01T00:00:00.000Z',
        lastSyncSnapshot: { email: 'old@lawmatics.com', phone: '555-0000' },
        locallyModifiedFields: ['email']
      }

      // New sync comes in with different values from Lawmatics
      const newIncoming = { email: 'updated@lawmatics.com', phone: '555-9999' }
      const decision = decideSyncAction(
        JSON.stringify(meta), 'LAWMATICS', newIncoming
      )

      expect(decision.action).toBe('update')
      // email is protected, phone is updated
      expect(decision.fieldsToUpdate).toEqual({ phone: '555-9999' })
      expect(decision.skippedFields).toEqual(['email'])

      // The snapshot reflects the LATEST Lawmatics values (for conflict review)
      const updated = JSON.parse(decision.updatedMetadata!) as ImportMetadata
      expect(updated.lastSyncSnapshot).toEqual(newIncoming)
      expect(updated.lastSyncedAt).toBe('2025-07-01T12:00:00.000Z')
    })
  })
})
