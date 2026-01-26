/**
 * Duplicate Detection for Lawmatics Import
 *
 * Detects duplicates BEFORE creating new records.
 * When a duplicate is found, the existing person ID is returned
 * so it can be added to the lookup cache, preventing cascade failures.
 *
 * Detection strategy:
 * 1. Email exact match (confidence: 100) - Primary check
 * 2. Normalized email match (confidence: 95) - lowercase, trim whitespace
 * 3. Future: Name + phone matching for contacts without email
 */

import type { LawmaticsContact } from './lawmatics-client'

// ===================================
// TYPES
// ===================================

export type DuplicateType = 'EMAIL' | 'NAME' | 'PHONE'

export interface DuplicateMatch {
  type: DuplicateType
  existingPersonId: string
  matchingField: string
  matchingValue: string
  confidenceScore: number
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
// EMAIL INDEX
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
 * - Lowercase
 * - Trim whitespace
 * - Handle common variations
 */
function normalizeEmail(email: string): string | null {
  if (!email) return null

  let normalized = email.toLowerCase().trim()

  // Skip placeholder emails (generated during previous imports)
  if (normalized.includes('@imported.local') || normalized.includes('@placeholder.local')) {
    return null
  }

  // Remove common "plus addressing" patterns (e.g., john+tag@gmail.com -> john@gmail.com)
  // This helps detect duplicates even when plus addresses are used
  // Disabled for now - keeping strict matching
  // const plusIndex = normalized.indexOf('+')
  // if (plusIndex > 0) {
  //   const atIndex = normalized.indexOf('@')
  //   if (atIndex > plusIndex) {
  //     normalized = normalized.substring(0, plusIndex) + normalized.substring(atIndex)
  //   }
  // }

  return normalized
}

// ===================================
// DUPLICATE DETECTION
// ===================================

/**
 * Check if a Lawmatics contact is a duplicate of an existing person.
 *
 * CRITICAL: This function is called BEFORE transforming the contact.
 * If a duplicate is found, we skip creating a new record but still
 * add the existing person ID to the lookup cache.
 *
 * @param contact The Lawmatics contact to check
 * @param emailIndex Pre-built index of existing emails
 * @returns DuplicateCheckResult with match info if duplicate found
 */
export function checkForDuplicates(
  contact: LawmaticsContact,
  emailIndex: Map<string, EmailIndexEntry>
): DuplicateCheckResult {
  // Get email from contact
  const contactEmail = contact.attributes.email || contact.attributes.email_address

  if (!contactEmail) {
    // No email to check - not a duplicate by email
    // Future: Could check name + phone here
    return { isDuplicate: false }
  }

  const normalizedEmail = normalizeEmail(contactEmail)

  if (!normalizedEmail) {
    // Email is a placeholder, skip duplicate check
    return { isDuplicate: false }
  }

  // Check email index for match
  const match = emailIndex.get(normalizedEmail)

  if (match) {
    return {
      isDuplicate: true,
      bestMatch: {
        type: 'EMAIL',
        existingPersonId: match.personId,
        matchingField: 'email',
        matchingValue: contactEmail,
        confidenceScore: 100 // Exact email match
      }
    }
  }

  return { isDuplicate: false }
}

/**
 * Check if a specific email already exists in the people table.
 * Used for quick single-email checks when full index isn't needed.
 */
export async function emailExistsInPeople(email: string): Promise<{ exists: boolean; personId?: string }> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return { exists: false }
  }

  // Note: SQLite LIKE is case-insensitive by default
  const existing = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.email, email)) // Case-sensitive first
    .limit(1)
    .get()

  if (existing) {
    return { exists: true, personId: existing.id }
  }

  // Try case-insensitive if exact match failed
  // This uses SQLite's LIKE which is case-insensitive
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
