/**
 * Blocking Key Generation + Candidate Retrieval
 *
 * Blocking reduces the number of pairwise comparisons needed.
 * Instead of comparing every record against every other record (O(n²)),
 * we generate "blocking keys" for each record and only compare records
 * that share at least one key.
 */

import { doubleMetaphone } from 'double-metaphone'
import { normalizeEmail, normalizeName, extractPhoneDigits } from './normalizers'
import type { PersonRecord } from './types'

/**
 * Generate blocking keys for a person record.
 * Returns multiple keys — any shared key means two records are candidates for comparison.
 */
export function generateBlockingKeys(record: PersonRecord): string[] {
  const keys: string[] = []

  // 1. Phonetic last name
  if (record.lastName) {
    const normalized = normalizeName(record.lastName)
    if (normalized) {
      const meta = doubleMetaphone(normalized)
      if (meta[0]) keys.push(`lname_meta:${meta[0]}`)
    }
  }

  // 2. Exact email
  if (record.email) {
    const normalized = normalizeEmail(record.email)
    if (normalized) keys.push(`email:${normalized}`)
  }

  // 3. Phone last 7 digits
  if (record.phone) {
    const digits = extractPhoneDigits(record.phone, 7)
    if (digits) keys.push(`phone_last7:${digits.slice(-7)}`)
  }

  // 4. Zip code
  if (record.zipCode) {
    const zip = record.zipCode.trim().slice(0, 5)
    if (zip.length === 5) keys.push(`zip:${zip}`)
  }

  return keys
}

/**
 * Build a blocking index from an array of person records.
 * Maps blocking key → set of array indices.
 */
export function buildBlockingIndex(people: PersonRecord[]): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>()

  for (let i = 0; i < people.length; i++) {
    const keys = generateBlockingKeys(people[i]!)
    for (const key of keys) {
      let set = index.get(key)
      if (!set) {
        set = new Set()
        index.set(key, set)
      }
      set.add(i)
    }
  }

  return index
}

/**
 * Get the set of candidate indices for a given record.
 * Union of all candidate sets for the record's blocking keys.
 */
export function getCandidateIndices(
  record: PersonRecord,
  index: Map<string, Set<number>>
): Set<number> {
  const candidates = new Set<number>()
  const keys = generateBlockingKeys(record)

  for (const key of keys) {
    const set = index.get(key)
    if (set) {
      for (const idx of set) {
        candidates.add(idx)
      }
    }
  }

  return candidates
}
