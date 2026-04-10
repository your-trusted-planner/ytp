/**
 * Record Matcher Types
 *
 * Source-agnostic types for probabilistic record matching.
 * Used by the matching engine and consumed by integrations (Lawmatics, etc.)
 */

/** Any person-like record from any source */
export interface PersonRecord {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string // ISO date or parseable date string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  tinLast4?: string
}

/** Result of comparing a single field */
export interface FieldScore {
  field: string // 'firstName', 'lastName', 'email', etc.
  score: number // 0.0–1.0
  method: string // 'exact', 'nickname', 'metaphone', 'levenshtein', etc.
  details?: string // Human-readable note ("Bob→Robert via nickname table")
}

/** Signal that suppresses match score */
export interface AntiSignal {
  type: string // 'shared_email_different_name', 'known_spouse', 'different_dob'
  penalty: number // Amount to subtract from composite score
  description: string
}

/** A candidate match with full scoring breakdown */
export interface MatchCandidate {
  personId: string
  personName: string
  rawScore: number // Weighted sum of field scores (0.0–1.0)
  adjustedScore: number // After anti-signal penalties
  confidence: 'high' | 'medium' | 'low'
  fieldScores: FieldScore[]
  antiSignals: AntiSignal[]
}

/** Configuration for the matching engine */
export interface MatchConfig {
  weights: Record<string, number> // Field weights (must sum to 1.0)
  thresholds: { high: number, medium: number } // Classification thresholds
  antiSignalPenalties: Record<string, number>
}

/** Preloaded index for batch matching */
export interface MatchIndex {
  findMatches(record: PersonRecord): MatchCandidate[]
}
