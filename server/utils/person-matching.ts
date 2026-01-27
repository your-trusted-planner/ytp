/**
 * Person Matching Utilities
 *
 * Reusable utilities for finding potential person matches in the database,
 * calculating match confidence, and managing person deduplication decisions.
 *
 * Used by import processes (WealthCounsel, future integrations) and
 * record creation flows where duplicate detection is needed.
 *
 * NOTE: Database functions use lazy imports to allow pure utility functions
 * to be imported in environments where @nuxthub/db is not available (e.g., tests).
 */

// Database imports are done lazily in functions that need them
// This allows pure utility functions to be imported without triggering @nuxthub/db

// ===================================
// TYPES
// ===================================

/**
 * Match types ordered by confidence level
 */
export type MatchType = 'SSN' | 'NAME_EMAIL' | 'NAME_DOB' | 'NAME_ONLY'

/**
 * A potential match found in the database
 */
export interface PersonMatch {
  personId: string
  personName: string
  email?: string | null
  dateOfBirth?: string | null
  matchType: MatchType
  confidence: number // 0-100
  matchingFields: string[]
}

/**
 * Input for finding matches - the extracted person data
 */
export interface PersonToMatch {
  name: string
  email?: string
  dateOfBirth?: string
  ssn?: string // Last 4 or full, depending on what's available
}

/**
 * A person extracted from an import source with their potential matches
 */
export interface ExtractedPerson<TRole extends string = string> {
  extractedName: string
  extractedEmail?: string
  extractedDateOfBirth?: string
  role: TRole
  rolesInPlan: string[] // All roles this person has in the context
  matches: PersonMatch[]
  // User's decision (set during import review)
  decision?: 'use_existing' | 'create_new'
  selectedPersonId?: string // If use_existing
}

/**
 * User's decision for a specific extracted person
 */
export interface PersonMatchDecision {
  extractedName: string
  action: 'use_existing' | 'create_new'
  existingPersonId?: string // Required if action is 'use_existing'
}

/**
 * Options for finding matches
 */
export interface FindMatchesOptions {
  /** Maximum number of matches to return per person */
  limit?: number
  /** Minimum confidence threshold (0-100) */
  minConfidence?: number
  /** Whether to include SSN matching (requires SSN data) */
  includeSsnMatching?: boolean
}

// ===================================
// CONFIDENCE CALCULATION
// ===================================

/**
 * Default confidence scores for different match types.
 * Can be overridden when calling calculateMatchConfidence.
 */
export const DEFAULT_CONFIDENCE_SCORES = {
  SSN: 99,
  NAME_EMAIL: 95,
  NAME_DOB: 85,
  EMAIL_ONLY: 80,
  NAME_ONLY: 60
} as const

/**
 * Calculate match confidence between an extracted person and a database person.
 * Returns null if no meaningful match is found.
 */
export function calculateMatchConfidence(
  extracted: PersonToMatch,
  dbPerson: {
    fullName?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    dateOfBirth?: string | null
    ssnLast4?: string | null
  },
  confidenceScores = DEFAULT_CONFIDENCE_SCORES
): PersonMatch | null {
  const matchingFields: string[] = []

  // Build the display name from db person
  const dbPersonName = dbPerson.fullName ||
    [dbPerson.firstName, dbPerson.lastName].filter(Boolean).join(' ') ||
    ''

  // Check what matches
  const nameMatches = extracted.name && (
    dbPerson.fullName === extracted.name ||
    dbPersonName.toLowerCase() === extracted.name.toLowerCase()
  )

  const emailMatches = extracted.email &&
    dbPerson.email &&
    dbPerson.email.toLowerCase() === extracted.email.toLowerCase()

  const dobMatches = extracted.dateOfBirth &&
    dbPerson.dateOfBirth === extracted.dateOfBirth

  const ssnMatches = extracted.ssn &&
    dbPerson.ssnLast4 &&
    extracted.ssn.slice(-4) === dbPerson.ssnLast4

  // Track matching fields
  if (nameMatches) matchingFields.push('name')
  if (emailMatches) matchingFields.push('email')
  if (dobMatches) matchingFields.push('dateOfBirth')
  if (ssnMatches) matchingFields.push('ssn')

  // No match at all
  if (matchingFields.length === 0) return null

  // Determine match type and confidence (in priority order)
  let matchType: MatchType
  let confidence: number

  if (ssnMatches) {
    matchType = 'SSN'
    confidence = confidenceScores.SSN
  } else if (emailMatches && nameMatches) {
    matchType = 'NAME_EMAIL'
    confidence = confidenceScores.NAME_EMAIL
  } else if (dobMatches && nameMatches) {
    matchType = 'NAME_DOB'
    confidence = confidenceScores.NAME_DOB
  } else if (emailMatches) {
    // Email matches but name doesn't - still valuable but lower confidence
    matchType = 'NAME_EMAIL'
    confidence = confidenceScores.EMAIL_ONLY
  } else if (nameMatches) {
    matchType = 'NAME_ONLY'
    confidence = confidenceScores.NAME_ONLY
  } else {
    // Only DOB or other fields match without name - not useful
    return null
  }

  return {
    personId: '', // Caller must set this
    personName: dbPersonName,
    email: dbPerson.email,
    dateOfBirth: dbPerson.dateOfBirth,
    matchType,
    confidence,
    matchingFields
  }
}

// ===================================
// DATABASE MATCHING
// ===================================

/**
 * Find potential matches for a person in the database.
 * Queries by email and/or name and returns matches sorted by confidence.
 *
 * NOTE: Uses lazy import for database to allow pure functions to be imported
 * without triggering @nuxthub/db in test environments.
 */
export async function findPersonMatches(
  person: PersonToMatch,
  options: FindMatchesOptions = {}
): Promise<PersonMatch[]> {
  const { limit = 5, minConfidence = 0 } = options

  if (!person.name && !person.email) {
    return []
  }

  // Lazy import database modules
  const { useDrizzle, schema } = await import('../db')
  const { or, eq } = await import('drizzle-orm')

  const db = useDrizzle()
  const conditions = []

  // Build OR conditions for potential matches
  if (person.email) {
    conditions.push(eq(schema.people.email, person.email))
  }
  if (person.name) {
    conditions.push(eq(schema.people.fullName, person.name))
  }

  if (conditions.length === 0) return []

  // Query potential matches
  const potentialMatches = await db.select()
    .from(schema.people)
    .where(or(...conditions))
    .limit(limit * 2) // Fetch extra in case some are filtered out

  // Calculate confidence for each match
  const matches: PersonMatch[] = []

  for (const dbPerson of potentialMatches) {
    const match = calculateMatchConfidence(person, dbPerson)
    if (match && match.confidence >= minConfidence) {
      match.personId = dbPerson.id
      matches.push(match)
    }
  }

  // Sort by confidence descending and limit
  return matches
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}

/**
 * Find matches for multiple people in batch.
 * More efficient than calling findPersonMatches individually.
 */
export async function findPersonMatchesBatch(
  people: PersonToMatch[],
  options: FindMatchesOptions = {}
): Promise<Map<string, PersonMatch[]>> {
  const results = new Map<string, PersonMatch[]>()

  // For now, call findPersonMatches for each person
  // Future optimization: batch the database queries
  for (const person of people) {
    const matches = await findPersonMatches(person, options)
    results.set(person.name, matches)
  }

  return results
}

// ===================================
// DECISION HANDLING
// ===================================

/**
 * Build a lookup map from person decisions.
 * Maps extracted names to their resolved person IDs.
 */
export function buildDecisionLookup(
  decisions: PersonMatchDecision[]
): Map<string, { action: 'use_existing' | 'create_new'; existingPersonId?: string }> {
  const lookup = new Map<string, { action: 'use_existing' | 'create_new'; existingPersonId?: string }>()

  for (const decision of decisions) {
    lookup.set(decision.extractedName, {
      action: decision.action,
      existingPersonId: decision.existingPersonId
    })
  }

  return lookup
}

/**
 * Build a person ID lookup from decisions.
 * Returns a map of extracted name -> person ID for all use_existing decisions.
 */
export function buildPersonIdLookupFromDecisions(
  decisions: PersonMatchDecision[]
): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const decision of decisions) {
    if (decision.action === 'use_existing' && decision.existingPersonId) {
      lookup.set(decision.extractedName, decision.existingPersonId)
    }
  }

  return lookup
}

/**
 * Determine if a person should be created based on decisions.
 *
 * @param extractedName - The name of the extracted person
 * @param decisionLookup - Map of decisions from buildDecisionLookup
 * @param defaultToCreate - If no decision exists, should we create? (default: true)
 */
export function shouldCreatePerson(
  extractedName: string,
  decisionLookup: Map<string, { action: 'use_existing' | 'create_new'; existingPersonId?: string }>,
  defaultToCreate = true
): boolean {
  const decision = decisionLookup.get(extractedName)

  if (!decision) {
    return defaultToCreate
  }

  return decision.action === 'create_new'
}

// ===================================
// PERSON EXTRACTION HELPERS
// ===================================

/**
 * Helper class for extracting unique people from import data.
 * Tracks seen names and aggregates roles for deduplication.
 */
export class PersonExtractor<TRole extends string = string> {
  private seenNames = new Set<string>()
  private extractedPeople: ExtractedPerson<TRole>[] = []
  private rolesByName = new Map<string, string[]>()

  /**
   * Add a person if not already seen.
   * If the person was already added, their roles are merged.
   */
  add(
    name: string,
    role: TRole,
    rolesInPlan: string[],
    email?: string,
    dateOfBirth?: string
  ): void {
    if (!name) return

    // Track roles for this person
    const existingRoles = this.rolesByName.get(name) || []
    for (const r of rolesInPlan) {
      if (!existingRoles.includes(r)) {
        existingRoles.push(r)
      }
    }
    this.rolesByName.set(name, existingRoles)

    // Only add once
    if (this.seenNames.has(name)) return
    this.seenNames.add(name)

    this.extractedPeople.push({
      extractedName: name,
      extractedEmail: email,
      extractedDateOfBirth: dateOfBirth,
      role,
      rolesInPlan: existingRoles,
      matches: []
    })
  }

  /**
   * Add a role for an existing person.
   * Call this after initial extraction to aggregate fiduciary roles.
   */
  addRole(name: string, role: string): void {
    if (!name) return

    const existingRoles = this.rolesByName.get(name) || []
    if (!existingRoles.includes(role)) {
      existingRoles.push(role)
      this.rolesByName.set(name, existingRoles)

      // Update the extracted person if already added
      const person = this.extractedPeople.find(p => p.extractedName === name)
      if (person) {
        person.rolesInPlan = existingRoles
      }
    }
  }

  /**
   * Get all extracted people.
   */
  getAll(): ExtractedPerson<TRole>[] {
    return this.extractedPeople
  }

  /**
   * Get a specific extracted person by name.
   */
  get(name: string): ExtractedPerson<TRole> | undefined {
    return this.extractedPeople.find(p => p.extractedName === name)
  }

  /**
   * Check if a person has been extracted.
   */
  has(name: string): boolean {
    return this.seenNames.has(name)
  }

  /**
   * Get all roles for a person.
   */
  getRoles(name: string): string[] {
    return this.rolesByName.get(name) || []
  }

  /**
   * Find matches for all extracted people and populate their matches array.
   */
  async findAllMatches(options: FindMatchesOptions = {}): Promise<void> {
    for (const person of this.extractedPeople) {
      person.matches = await findPersonMatches(
        {
          name: person.extractedName,
          email: person.extractedEmail,
          dateOfBirth: person.extractedDateOfBirth
        },
        options
      )
    }
  }

  /**
   * Get extracted people filtered by role.
   */
  getByRole(role: TRole): ExtractedPerson<TRole>[] {
    return this.extractedPeople.filter(p => p.role === role)
  }

  /**
   * Get count of extracted people.
   */
  get count(): number {
    return this.extractedPeople.length
  }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Check if a person match is high confidence (likely the same person).
 */
export function isHighConfidenceMatch(match: PersonMatch, threshold = 80): boolean {
  return match.confidence >= threshold
}

/**
 * Check if there's an exact match (SSN or NAME_EMAIL with high confidence).
 */
export function hasExactMatch(matches: PersonMatch[]): boolean {
  return matches.some(m =>
    m.matchType === 'SSN' ||
    (m.matchType === 'NAME_EMAIL' && m.confidence >= 95)
  )
}

/**
 * Get the best match from a list of matches.
 */
export function getBestMatch(matches: PersonMatch[]): PersonMatch | undefined {
  if (matches.length === 0) return undefined

  // Already sorted by confidence in findPersonMatches
  return matches[0]
}

/**
 * Format match type for display.
 */
export function formatMatchType(matchType: MatchType): string {
  switch (matchType) {
    case 'SSN':
      return 'SSN Match'
    case 'NAME_EMAIL':
      return 'Name & Email'
    case 'NAME_DOB':
      return 'Name & Date of Birth'
    case 'NAME_ONLY':
      return 'Name Only'
    default:
      return matchType
  }
}

/**
 * Get confidence level label for display.
 */
export function getConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 85) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}
