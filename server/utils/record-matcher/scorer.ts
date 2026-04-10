/**
 * Record-Level Scoring + Anti-Signals
 *
 * Combines field-level scores into a composite match score,
 * then applies anti-signals (penalties for contradictory evidence).
 */

import type { PersonRecord, FieldScore, AntiSignal, MatchConfig } from './types'
import { DEFAULT_MATCH_CONFIG } from './config'
import {
  compareEmail,
  compareFirstName,
  compareLastName,
  comparePhone,
  compareDateOfBirth,
  compareAddress
} from './comparators'

const FIELD_COMPARATORS: Record<string, (a: any, b: any) => FieldScore> = {
  email: compareEmail,
  firstName: compareFirstName,
  lastName: compareLastName,
  phone: comparePhone,
  dateOfBirth: compareDateOfBirth,
  address: (a: string | undefined, b: string | undefined) => {
    // Combine address fields if available
    return compareAddress(a, b)
  }
}

/**
 * Score a pair of records by comparing all available fields.
 * Missing fields have their weight redistributed proportionally.
 */
export function scoreRecordPair(
  input: PersonRecord,
  candidate: PersonRecord,
  config: MatchConfig = DEFAULT_MATCH_CONFIG
): { rawScore: number, fieldScores: FieldScore[] } {
  const fieldScores: FieldScore[] = []
  let totalWeight = 0
  let weightedSum = 0

  // Determine which fields are present in both records
  const fieldValues: Record<string, { a: any, b: any }> = {
    email: { a: input.email, b: candidate.email },
    firstName: { a: input.firstName, b: candidate.firstName },
    lastName: { a: input.lastName, b: candidate.lastName },
    phone: { a: input.phone, b: candidate.phone },
    dateOfBirth: { a: input.dateOfBirth, b: candidate.dateOfBirth },
    address: {
      a: buildAddressString(input),
      b: buildAddressString(candidate)
    }
  }

  // Calculate scores for present fields and track total active weight
  for (const [field, weight] of Object.entries(config.weights)) {
    const values = fieldValues[field]
    if (!values) continue

    const comparator = FIELD_COMPARATORS[field]
    if (!comparator) continue

    const score = comparator(values.a, values.b)
    fieldScores.push(score)

    // Only include in weighting if both records have this field
    if (score.method !== 'missing' && score.method !== 'placeholder') {
      totalWeight += weight
      weightedSum += score.score * weight
    }
  }

  // Normalize by active weight (redistributes missing field weight)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0

  return {
    rawScore: Math.round(rawScore * 1000) / 1000,
    fieldScores
  }
}

/**
 * Apply anti-signals to a raw score.
 * Anti-signals are penalties for contradictory evidence that should
 * suppress a match even when other fields agree.
 */
export function applyAntiSignals(
  input: PersonRecord,
  candidate: PersonRecord,
  rawScore: number,
  fieldScores: FieldScore[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
  knownSpousePersonIds?: Set<string>,
  candidatePersonId?: string
): { adjustedScore: number, antiSignals: AntiSignal[] } {
  const antiSignals: AntiSignal[] = []

  const emailScore = fieldScores.find(s => s.field === 'email')
  const firstNameScore = fieldScores.find(s => s.field === 'firstName')
  const dobScore = fieldScores.find(s => s.field === 'dateOfBirth')

  // 1. Shared email + different first name (spouse signal)
  // Threshold 0.90: nickname matches (0.95) pass, but metaphone-only matches (0.85)
  // like John/Jane (same phonetics, different people) trigger the penalty
  if (emailScore && emailScore.score === 1.0 &&
    firstNameScore && firstNameScore.score < 0.90 &&
    firstNameScore.method !== 'missing') {
    const penalty = config.antiSignalPenalties.shared_email_different_name ?? 0.40
    antiSignals.push({
      type: 'shared_email_different_name',
      penalty,
      description: `Same email but different first name (${input.firstName} vs ${candidate.firstName}) — likely spouses`
    })
  }

  // 2. Known spouse relationship
  if (knownSpousePersonIds && candidatePersonId && knownSpousePersonIds.has(candidatePersonId)) {
    const penalty = config.antiSignalPenalties.known_spouse ?? 1.0
    antiSignals.push({
      type: 'known_spouse',
      penalty,
      description: `Known spousal relationship — definitive non-match`
    })
  }

  // 3. Different date of birth
  if (dobScore && dobScore.method !== 'missing' && dobScore.score === 0) {
    const penalty = config.antiSignalPenalties.different_dob ?? 0.30
    antiSignals.push({
      type: 'different_dob',
      penalty,
      description: `Different dates of birth (${input.dateOfBirth} vs ${candidate.dateOfBirth})`
    })
  }

  // 4. Different TIN (definitive)
  if (input.tinLast4 && candidate.tinLast4 && input.tinLast4 !== candidate.tinLast4) {
    const penalty = config.antiSignalPenalties.different_ssn ?? 1.0
    antiSignals.push({
      type: 'different_tin',
      penalty,
      description: `Different TIN last 4 digits`
    })
  }

  const totalPenalty = antiSignals.reduce((sum, s) => sum + s.penalty, 0)
  const adjustedScore = Math.max(0, Math.round((rawScore - totalPenalty) * 1000) / 1000)

  return { adjustedScore, antiSignals }
}

/**
 * Classify a match score into confidence levels.
 */
export function classifyMatch(
  adjustedScore: number,
  thresholds: { high: number, medium: number } = DEFAULT_MATCH_CONFIG.thresholds
): 'high' | 'medium' | 'low' {
  if (adjustedScore >= thresholds.high) return 'high'
  if (adjustedScore >= thresholds.medium) return 'medium'
  return 'low'
}

// ===================================
// HELPERS
// ===================================

function buildAddressString(record: PersonRecord): string | undefined {
  const parts = [record.address, record.city, record.state, record.zipCode].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}
