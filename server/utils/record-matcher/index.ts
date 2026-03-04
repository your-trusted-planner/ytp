/**
 * Record Matcher — Public API
 *
 * Source-agnostic probabilistic record matching engine.
 * Composes normalizers, comparators, blocking, and scoring
 * into a unified matching interface.
 */

import type { PersonRecord, MatchCandidate, MatchConfig, MatchIndex } from './types'
import { DEFAULT_MATCH_CONFIG } from './config'
import { buildBlockingIndex, getCandidateIndices } from './blocking'
import { scoreRecordPair, applyAntiSignals, classifyMatch } from './scorer'

// Re-export types for consumers
export type { PersonRecord, MatchCandidate, MatchConfig, MatchIndex, FieldScore, AntiSignal } from './types'
export { DEFAULT_MATCH_CONFIG } from './config'
export { scoreRecordPair, applyAntiSignals, classifyMatch } from './scorer'
export { generateBlockingKeys, buildBlockingIndex, getCandidateIndices } from './blocking'

/** Internal representation for indexed people */
interface IndexedPerson extends PersonRecord {
  _personId: string
  _personName: string
}

/**
 * Score two records directly.
 * Pure function, no DB — useful for testing and ad-hoc comparisons.
 */
export function scoreRecords(
  a: PersonRecord,
  b: PersonRecord,
  config?: MatchConfig
): Omit<MatchCandidate, 'personId' | 'personName'> {
  const effectiveConfig = config || DEFAULT_MATCH_CONFIG

  const { rawScore, fieldScores } = scoreRecordPair(a, b, effectiveConfig)
  const { adjustedScore, antiSignals } = applyAntiSignals(a, b, rawScore, fieldScores, effectiveConfig)
  const confidence = classifyMatch(adjustedScore, effectiveConfig.thresholds)

  return {
    rawScore,
    adjustedScore,
    confidence,
    fieldScores,
    antiSignals
  }
}

/**
 * Build a match index from all people in the database.
 * Preloads people + blocking index for batch use during sync.
 * Avoids re-querying the DB for every record in a batch.
 */
export async function buildMatchIndex(config?: MatchConfig): Promise<MatchIndex> {
  const effectiveConfig = config || DEFAULT_MATCH_CONFIG

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Load all people with relevant fields
  const allPeople = await db.select({
    id: schema.people.id,
    firstName: schema.people.firstName,
    lastName: schema.people.lastName,
    fullName: schema.people.fullName,
    email: schema.people.email,
    phone: schema.people.phone,
    dateOfBirth: schema.people.dateOfBirth,
    address: schema.people.address,
    city: schema.people.city,
    state: schema.people.state,
    zipCode: schema.people.zipCode,
    ssnLast4: schema.people.ssnLast4
  })
    .from(schema.people)
    .all()

  // Load spousal relationships for anti-signal detection
  const spouseRelationships = await db.select({
    fromPersonId: schema.relationships.fromPersonId,
    toPersonId: schema.relationships.toPersonId
  })
    .from(schema.relationships)
    .where(eq(schema.relationships.relationshipType, 'SPOUSE'))
    .all()

  // Build spouse lookup: personId → Set of spouse personIds
  const spouseMap = new Map<string, Set<string>>()
  for (const rel of spouseRelationships) {
    if (!spouseMap.has(rel.fromPersonId)) spouseMap.set(rel.fromPersonId, new Set())
    if (!spouseMap.has(rel.toPersonId)) spouseMap.set(rel.toPersonId, new Set())
    spouseMap.get(rel.fromPersonId)!.add(rel.toPersonId)
    spouseMap.get(rel.toPersonId)!.add(rel.fromPersonId)
  }

  // Build indexed people array
  const indexedPeople: IndexedPerson[] = allPeople.map(p => ({
    _personId: p.id,
    _personName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
    firstName: p.firstName || undefined,
    lastName: p.lastName || undefined,
    email: p.email || undefined,
    phone: p.phone || undefined,
    dateOfBirth: p.dateOfBirth instanceof Date ? p.dateOfBirth.toISOString().split('T')[0] : (p.dateOfBirth as string | null) || undefined,
    address: p.address || undefined,
    city: p.city || undefined,
    state: p.state || undefined,
    zipCode: p.zipCode || undefined,
    ssnLast4: p.ssnLast4 || undefined
  }))

  // Build blocking index
  const blockingIndex = buildBlockingIndex(indexedPeople)

  console.log(`[Record Matcher] Built match index: ${indexedPeople.length} people, ${blockingIndex.size} blocking keys`)

  return {
    findMatches(record: PersonRecord): MatchCandidate[] {
      // Get candidate indices via blocking
      const candidateIndices = getCandidateIndices(record, blockingIndex)

      const matches: MatchCandidate[] = []

      for (const idx of candidateIndices) {
        const candidate = indexedPeople[idx]
        if (!candidate) continue

        // Score the pair
        const { rawScore, fieldScores } = scoreRecordPair(record, candidate, effectiveConfig)

        // Get spouse set for anti-signal
        const spouseIds = spouseMap.get(candidate._personId)

        // Apply anti-signals
        const { adjustedScore, antiSignals } = applyAntiSignals(
          record,
          candidate,
          rawScore,
          fieldScores,
          effectiveConfig,
          spouseIds,
          candidate._personId
        )

        const confidence = classifyMatch(adjustedScore, effectiveConfig.thresholds)

        // Only include medium or high confidence matches
        if (confidence !== 'low') {
          matches.push({
            personId: candidate._personId,
            personName: candidate._personName,
            rawScore,
            adjustedScore,
            confidence,
            fieldScores,
            antiSignals
          })
        }
      }

      // Sort by adjusted score descending
      matches.sort((a, b) => b.adjustedScore - a.adjustedScore)

      return matches
    }
  }
}

/**
 * Find duplicates for a single record.
 * Loads people from DB, builds blocking index, scores candidates.
 * For batch operations, use buildMatchIndex() instead.
 */
export async function findDuplicates(
  record: PersonRecord,
  config?: MatchConfig
): Promise<MatchCandidate[]> {
  const index = await buildMatchIndex(config)
  return index.findMatches(record)
}
