/**
 * Field-Level Comparators
 *
 * Each comparator returns a FieldScore (0.0–1.0 with method annotation).
 * All functions are pure — no side effects or DB access.
 */

import { distance as levenshteinDistance } from 'fastest-levenshtein'
import { doubleMetaphone } from 'double-metaphone'
import type { FieldScore } from './types'
import { normalizeEmail, normalizeName, normalizePhone, extractPhoneDigits, normalizeAddress } from './normalizers'
import { getCanonicalName } from './nickname-table'

/**
 * Compare two email addresses.
 * Exact match after normalization → 1.0, otherwise 0.0.
 */
export function compareEmail(a: string | undefined, b: string | undefined): FieldScore {
  if (!a || !b) return { field: 'email', score: 0, method: 'missing' }

  const normA = normalizeEmail(a)
  const normB = normalizeEmail(b)

  if (!normA || !normB) return { field: 'email', score: 0, method: 'placeholder' }

  if (normA === normB) {
    return { field: 'email', score: 1.0, method: 'exact' }
  }

  return { field: 'email', score: 0, method: 'none' }
}

/**
 * Compare two first names through a multi-stage pipeline:
 * 1. Exact match → 1.0
 * 2. Canonical nickname match → 0.95
 * 3. Double Metaphone primary → 0.85
 * 4. Double Metaphone secondary → 0.75
 * 5. Levenshtein (< 0.2 normalized) → 0.70
 * 6. Levenshtein (< 0.4 normalized) → 0.40
 * 7. No match → 0.0
 */
export function compareFirstName(a: string | undefined, b: string | undefined): FieldScore {
  if (!a || !b) return { field: 'firstName', score: 0, method: 'missing' }

  const normA = normalizeName(a)
  const normB = normalizeName(b)

  if (!normA || !normB) return { field: 'firstName', score: 0, method: 'empty' }

  // 1. Exact match
  if (normA === normB) {
    return { field: 'firstName', score: 1.0, method: 'exact' }
  }

  // 2. Nickname match
  const canonA = getCanonicalName(normA)
  const canonB = getCanonicalName(normB)
  if (canonA === canonB && canonA !== normA) {
    return {
      field: 'firstName',
      score: 0.95,
      method: 'nickname',
      details: `${a}→${canonA} via nickname table`
    }
  }
  // Also handle cases where only one direction is a known nickname
  if (canonA === canonB) {
    return {
      field: 'firstName',
      score: 0.95,
      method: 'nickname',
      details: `${a}↔${b} share canonical: ${canonA}`
    }
  }

  // 3. Double Metaphone (primary)
  const metaA = doubleMetaphone(normA)
  const metaB = doubleMetaphone(normB)

  if (metaA[0] && metaB[0] && metaA[0] === metaB[0]) {
    return {
      field: 'firstName',
      score: 0.85,
      method: 'metaphone',
      details: `Primary metaphone: ${metaA[0]}`
    }
  }

  // 4. Double Metaphone (secondary)
  if (metaA[1] && metaB[1] && metaA[1] === metaB[1]) {
    return {
      field: 'firstName',
      score: 0.75,
      method: 'metaphone_secondary',
      details: `Secondary metaphone: ${metaA[1]}`
    }
  }

  // Cross-compare primary/secondary
  if ((metaA[0] && metaB[1] && metaA[0] === metaB[1]) ||
    (metaA[1] && metaB[0] && metaA[1] === metaB[0])) {
    return {
      field: 'firstName',
      score: 0.75,
      method: 'metaphone_secondary',
      details: `Cross metaphone match`
    }
  }

  // 5–6. Levenshtein distance
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen > 0) {
    const dist = levenshteinDistance(normA, normB)
    const normalizedDist = dist / maxLen

    if (normalizedDist < 0.2) {
      return {
        field: 'firstName',
        score: 0.70,
        method: 'levenshtein',
        details: `Edit distance: ${dist}/${maxLen} (${(normalizedDist * 100).toFixed(0)}%)`
      }
    }

    if (normalizedDist < 0.4) {
      return {
        field: 'firstName',
        score: 0.40,
        method: 'levenshtein',
        details: `Edit distance: ${dist}/${maxLen} (${(normalizedDist * 100).toFixed(0)}%)`
      }
    }
  }

  return { field: 'firstName', score: 0, method: 'none' }
}

/**
 * Compare two last names. Same pipeline as first name minus nickname step.
 */
export function compareLastName(a: string | undefined, b: string | undefined): FieldScore {
  if (!a || !b) return { field: 'lastName', score: 0, method: 'missing' }

  const normA = normalizeName(a)
  const normB = normalizeName(b)

  if (!normA || !normB) return { field: 'lastName', score: 0, method: 'empty' }

  // 1. Exact match
  if (normA === normB) {
    return { field: 'lastName', score: 1.0, method: 'exact' }
  }

  // 2. Double Metaphone (primary)
  const metaA = doubleMetaphone(normA)
  const metaB = doubleMetaphone(normB)

  if (metaA[0] && metaB[0] && metaA[0] === metaB[0]) {
    return {
      field: 'lastName',
      score: 0.85,
      method: 'metaphone',
      details: `Primary metaphone: ${metaA[0]}`
    }
  }

  // 3. Double Metaphone (secondary)
  if (metaA[1] && metaB[1] && metaA[1] === metaB[1]) {
    return {
      field: 'lastName',
      score: 0.75,
      method: 'metaphone_secondary',
      details: `Secondary metaphone: ${metaA[1]}`
    }
  }

  // Cross-compare
  if ((metaA[0] && metaB[1] && metaA[0] === metaB[1]) ||
    (metaA[1] && metaB[0] && metaA[1] === metaB[0])) {
    return {
      field: 'lastName',
      score: 0.75,
      method: 'metaphone_secondary',
      details: `Cross metaphone match`
    }
  }

  // 4–5. Levenshtein
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen > 0) {
    const dist = levenshteinDistance(normA, normB)
    const normalizedDist = dist / maxLen

    if (normalizedDist < 0.2) {
      return {
        field: 'lastName',
        score: 0.70,
        method: 'levenshtein',
        details: `Edit distance: ${dist}/${maxLen} (${(normalizedDist * 100).toFixed(0)}%)`
      }
    }

    if (normalizedDist < 0.4) {
      return {
        field: 'lastName',
        score: 0.40,
        method: 'levenshtein',
        details: `Edit distance: ${dist}/${maxLen} (${(normalizedDist * 100).toFixed(0)}%)`
      }
    }
  }

  return { field: 'lastName', score: 0, method: 'none' }
}

/**
 * Compare two phone numbers.
 * E.164 match → 1.0, national match → 0.90, last 7 digits → 0.70.
 */
export function comparePhone(a: string | undefined, b: string | undefined, defaultCountry?: string): FieldScore {
  if (!a || !b) return { field: 'phone', score: 0, method: 'missing' }

  const normA = normalizePhone(a, defaultCountry)
  const normB = normalizePhone(b, defaultCountry)

  // Full E.164 match
  if (normA && normB && normA === normB) {
    return { field: 'phone', score: 1.0, method: 'exact', details: `E.164: ${normA}` }
  }

  // National number match (strip country code, compare digits)
  const digitsA = extractPhoneDigits(a, 10)
  const digitsB = extractPhoneDigits(b, 10)

  if (digitsA && digitsB && digitsA === digitsB) {
    return { field: 'phone', score: 0.90, method: 'national', details: `National digits: ${digitsA}` }
  }

  // Last 7 digits match (handles missing area codes)
  const last7A = extractPhoneDigits(a, 7)
  const last7B = extractPhoneDigits(b, 7)

  if (last7A && last7B && last7A.slice(-7) === last7B.slice(-7)) {
    return { field: 'phone', score: 0.70, method: 'last7', details: `Last 7 digits match` }
  }

  return { field: 'phone', score: 0, method: 'none' }
}

/**
 * Compare two dates of birth.
 * Exact → 1.0, month/day transposition → 0.70.
 */
export function compareDateOfBirth(a: string | undefined, b: string | undefined): FieldScore {
  if (!a || !b) return { field: 'dateOfBirth', score: 0, method: 'missing' }

  const dateA = parseDate(a)
  const dateB = parseDate(b)

  if (!dateA || !dateB) return { field: 'dateOfBirth', score: 0, method: 'unparseable' }

  // Exact match
  if (dateA.year === dateB.year && dateA.month === dateB.month && dateA.day === dateB.day) {
    return { field: 'dateOfBirth', score: 1.0, method: 'exact' }
  }

  // Month/day transposition (03/12 vs 12/03) — common data entry error
  if (dateA.year === dateB.year && dateA.month === dateB.day && dateA.day === dateB.month) {
    // Only flag as transposition if both month and day are valid as months (1-12)
    if (dateA.month <= 12 && dateA.day <= 12) {
      return {
        field: 'dateOfBirth',
        score: 0.70,
        method: 'transposition',
        details: `Month/day swap: ${dateA.month}/${dateA.day} vs ${dateB.month}/${dateB.day}`
      }
    }
  }

  return { field: 'dateOfBirth', score: 0, method: 'none' }
}

/**
 * Compare two addresses using token overlap (Jaccard similarity).
 */
export function compareAddress(a: string | undefined, b: string | undefined): FieldScore {
  if (!a || !b) return { field: 'address', score: 0, method: 'missing' }

  const normA = normalizeAddress(a)
  const normB = normalizeAddress(b)

  if (!normA || !normB) return { field: 'address', score: 0, method: 'empty' }

  const tokensA = new Set(normA.split(/\s+/))
  const tokensB = new Set(normB.split(/\s+/))

  // Jaccard similarity: |intersection| / |union|
  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++
  }

  const union = new Set([...tokensA, ...tokensB]).size
  const score = union > 0 ? intersection / union : 0

  return {
    field: 'address',
    score: Math.round(score * 100) / 100,
    method: 'token_overlap',
    details: `${intersection}/${union} tokens overlap`
  }
}

// ===================================
// HELPERS
// ===================================

interface ParsedDate {
  year: number
  month: number
  day: number
}

function parseDate(input: string): ParsedDate | null {
  if (!input) return null

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1]!, 10),
      month: parseInt(isoMatch[2]!, 10),
      day: parseInt(isoMatch[3]!, 10)
    }
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    return {
      year: parseInt(usMatch[3]!, 10),
      month: parseInt(usMatch[1]!, 10),
      day: parseInt(usMatch[2]!, 10)
    }
  }

  // Try Date.parse as last resort
  const d = new Date(input)
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate()
    }
  }

  return null
}
