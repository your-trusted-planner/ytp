/**
 * Duplicate Detection for Lawmatics Import
 *
 * Detects duplicates BEFORE creating new records.
 * When a duplicate is found, the existing person ID is returned
 * so it can be added to the lookup cache, preventing cascade failures.
 *
 * Detection strategy:
 * 1. Probabilistic matching via record-matcher engine (name, email, phone, DOB, address)
 * 2. Anti-signal detection for shared-email spouses
 * 3. Falls back to email-only matching for backward compatibility
 */

import type { LawmaticsContact } from './lawmatics-client'
import type { MatchIndex, MatchCandidate, PersonRecord } from './record-matcher/types'

// ===================================
// TYPES
// ===================================

export type DuplicateType = 'EMAIL' | 'NAME' | 'PHONE' | 'PROBABILISTIC'

export interface DuplicateMatch {
  type: DuplicateType
  existingPersonId: string
  matchingField: string
  matchingValue: string
  confidenceScore: number
  /** Rich match metadata from the record-matcher engine */
  matchDetails?: {
    rawScore: number
    adjustedScore: number
    confidence: 'high' | 'medium' | 'low'
    fieldScores: Array<{ field: string, score: number, method: string, details?: string }>
    antiSignals: Array<{ type: string, penalty: number, description: string }>
  }
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  bestMatch?: DuplicateMatch
}

export interface EmailIndexEntry {
  personId: string
  originalEmail: string
}

// ===================================
// EMAIL INDEX (legacy, still used for fast within-batch dedup)
// ===================================

/**
 * Build an email index from all people in the database.
 * Maps normalized email (lowercase, trimmed) to person ID.
 * Called once at the start of contacts import phase.
 */
export async function buildEmailIndex(): Promise<Map<string, EmailIndexEntry>> {
  const { useDrizzle, schema } = await import('../db')
  const { isNotNull } = await import('drizzle-orm')
  const db = useDrizzle()

  const people = await db.select({
    id: schema.people.id,
    email: schema.people.email
  })
    .from(schema.people)
    .where(isNotNull(schema.people.email))
    .all()

  const index = new Map<string, EmailIndexEntry>()

  for (const person of people) {
    if (person.email) {
      const normalizedEmail = normalizeEmail(person.email)
      if (normalizedEmail) {
        index.set(normalizedEmail, {
          personId: person.id,
          originalEmail: person.email
        })
      }
    }
  }

  console.log(`[Duplicate Detector] Built email index with ${index.size} entries`)
  return index
}

/**
 * Normalize an email address for comparison.
 */
function normalizeEmail(email: string): string | null {
  if (!email) return null

  const normalized = email.toLowerCase().trim()

  // Skip placeholder emails (generated during previous imports)
  if (normalized.includes('@imported.local') || normalized.includes('@placeholder.local')) {
    return null
  }

  return normalized
}

// ===================================
// RECORD-MATCHER BASED DETECTION
// ===================================

/**
 * Extract a PersonRecord from a Lawmatics contact for matching.
 */
function contactToPersonRecord(contact: LawmaticsContact): PersonRecord {
  const attrs = contact.attributes
  return {
    firstName: attrs.first_name || undefined,
    lastName: attrs.last_name || undefined,
    email: attrs.email || attrs.email_address || undefined,
    phone: attrs.phone || attrs.phone_number || undefined,
    dateOfBirth: attrs.birthdate || undefined,
    address: attrs.address || undefined
  }
}

/**
 * Check for duplicates using the probabilistic record-matcher engine.
 * Returns a DuplicateCheckResult with rich match metadata.
 */
export function checkForDuplicatesWithMatcher(
  contact: LawmaticsContact,
  matchIndex: MatchIndex
): DuplicateCheckResult {
  const record = contactToPersonRecord(contact)
  const matches = matchIndex.findMatches(record)

  if (matches.length === 0) {
    return { isDuplicate: false }
  }

  // Use the best match (highest adjusted score)
  const best = matches[0]!

  // Determine the primary matching field for logging
  const sortedFieldScores = [...best.fieldScores]
    .filter(s => s.method !== 'missing')
    .sort((a, b) => b.score - a.score)
  const bestFieldScore = sortedFieldScores.length > 0 ? sortedFieldScores[0] : undefined

  const matchingField = bestFieldScore?.field || 'composite'
  const matchingValue = getFieldValue(record, matchingField)

  // Map confidence to duplicate type
  const type: DuplicateType = bestFieldScore && bestFieldScore.field === 'email' && bestFieldScore.score === 1.0 ?
    'EMAIL' :
    'PROBABILISTIC'

  return {
    isDuplicate: true,
    bestMatch: {
      type,
      existingPersonId: best.personId,
      matchingField,
      matchingValue: matchingValue || '',
      confidenceScore: Math.round(best.adjustedScore * 100),
      matchDetails: {
        rawScore: best.rawScore,
        adjustedScore: best.adjustedScore,
        confidence: best.confidence,
        fieldScores: best.fieldScores.map(s => ({
          field: s.field,
          score: s.score,
          method: s.method,
          details: s.details
        })),
        antiSignals: best.antiSignals.map(s => ({
          type: s.type,
          penalty: s.penalty,
          description: s.description
        }))
      }
    }
  }
}

/**
 * Legacy email-only duplicate check.
 * Kept for backward compatibility and for fast within-batch dedup.
 */
export function checkForDuplicates(
  contact: LawmaticsContact,
  emailIndex: Map<string, EmailIndexEntry>
): DuplicateCheckResult {
  const contactEmail = contact.attributes.email || contact.attributes.email_address

  if (!contactEmail) {
    return { isDuplicate: false }
  }

  const normalizedEmail = normalizeEmail(contactEmail)
  if (!normalizedEmail) {
    return { isDuplicate: false }
  }

  const match = emailIndex.get(normalizedEmail)
  if (match) {
    return {
      isDuplicate: true,
      bestMatch: {
        type: 'EMAIL',
        existingPersonId: match.personId,
        matchingField: 'email',
        matchingValue: contactEmail,
        confidenceScore: 100
      }
    }
  }

  return { isDuplicate: false }
}

/**
 * Check if a specific email already exists in the people table.
 * Used for quick single-email checks when full index isn't needed.
 */
export async function emailExistsInPeople(email: string): Promise<{ exists: boolean, personId?: string }> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return { exists: false }
  }

  const existing = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.email, email))
    .limit(1)
    .get()

  if (existing) {
    return { exists: true, personId: existing.id }
  }

  const { like } = await import('drizzle-orm')
  const caseInsensitive = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(like(schema.people.email, normalizedEmail))
    .limit(1)
    .get()

  if (caseInsensitive) {
    return { exists: true, personId: caseInsensitive.id }
  }

  return { exists: false }
}

// ===================================
// HELPERS
// ===================================

function getFieldValue(record: PersonRecord, field: string): string | undefined {
  switch (field) {
    case 'email': return record.email
    case 'firstName': return record.firstName
    case 'lastName': return record.lastName
    case 'phone': return record.phone
    case 'dateOfBirth': return record.dateOfBirth
    case 'address': return record.address
    default: return undefined
  }
}
