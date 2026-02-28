/**
 * Sync Metadata Utilities
 *
 * Manages importMetadata for records that are synced from external systems.
 * Tracks which fields have been locally modified in YTP so that
 * subsequent syncs don't overwrite local edits.
 */

import { eq, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'
import type { ImportMetadata } from './lawmatics-transformers'

/**
 * Check if a record was imported from an external system
 */
export function isImportedRecord(importMetadata: string | null | undefined): boolean {
  if (!importMetadata) return false
  try {
    const meta = JSON.parse(importMetadata) as ImportMetadata
    return !!meta.source
  } catch {
    return false
  }
}

/**
 * Get the list of locally modified fields from importMetadata
 */
export function getLocallyModifiedFields(importMetadata: string | null | undefined): string[] {
  if (!importMetadata) return []
  try {
    const meta = JSON.parse(importMetadata) as ImportMetadata
    return meta.locallyModifiedFields || []
  } catch {
    return []
  }
}

/**
 * Detect which fields actually changed between existing and new values
 */
function detectChangedFields(
  existing: Record<string, any>,
  incoming: Record<string, any>,
  fieldNames: string[]
): string[] {
  const changed: string[] = []
  for (const field of fieldNames) {
    const existingVal = existing[field]
    const incomingVal = incoming[field]

    // Normalize nulls/undefined/empty strings for comparison
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

/**
 * Mark fields as locally modified on an imported record.
 * Only acts on records that have importMetadata with a source set.
 *
 * @param tableName - The table containing the record
 * @param recordId - The record's primary key
 * @param existingRecord - The record's current state (must include importMetadata and the fields being checked)
 * @param newValues - The new values being applied
 * @param trackableFields - Field names to check for changes
 */
export async function markFieldsAsLocallyModified(
  tableName: 'people' | 'users' | 'matters',
  recordId: string,
  existingRecord: Record<string, any>,
  newValues: Record<string, any>,
  trackableFields: string[]
): Promise<string[]> {
  const rawMeta = existingRecord.importMetadata
  if (!rawMeta || !isImportedRecord(rawMeta)) {
    return [] // Not an imported record, nothing to track
  }

  // Detect which fields actually changed
  const changedFields = detectChangedFields(existingRecord, newValues, trackableFields)
  if (changedFields.length === 0) {
    return [] // No actual changes
  }

  // Parse existing metadata
  let meta: ImportMetadata
  try {
    meta = JSON.parse(rawMeta) as ImportMetadata
  } catch {
    return []
  }

  // Merge with existing locally modified fields (deduplicate)
  const existing = new Set(meta.locallyModifiedFields || [])
  for (const field of changedFields) {
    existing.add(field)
  }
  meta.locallyModifiedFields = Array.from(existing)

  // Write back to database
  const db = useDrizzle()
  const metadataJson = JSON.stringify(meta)

  switch (tableName) {
    case 'people':
      await db.update(schema.people)
        .set({ importMetadata: metadataJson })
        .where(eq(schema.people.id, recordId))
      break
    case 'users':
      await db.update(schema.users)
        .set({ importMetadata: metadataJson })
        .where(eq(schema.users.id, recordId))
      break
    case 'matters':
      await db.update(schema.matters)
        .set({ importMetadata: metadataJson })
        .where(eq(schema.matters.id, recordId))
      break
  }

  return changedFields
}
