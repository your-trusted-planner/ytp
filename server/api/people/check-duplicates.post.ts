import { z } from 'zod'
import { findDuplicates } from '../../utils/record-matcher'
import type { MatchCandidate } from '../../utils/record-matcher'

const checkDuplicatesSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  tinLast4: z.string().max(4).optional()
})

/**
 * Count how many distinct identifying fields the input provides.
 * Used to cap the maximum confidence when input is sparse.
 *
 * The record-matcher redistributes weight across present fields,
 * which is correct for batch imports but inflates scores for sparse
 * interactive input (e.g. last name only → 100%). Rather than a
 * linear coverage multiplier (which is too aggressive), we cap the
 * maximum achievable confidence tier by field count:
 *
 *   1 field  → max "low"    (filtered out entirely)
 *   2 fields → max "medium" (shown as a suggestion, never "high")
 *   3+ fields → no cap      (full confidence from matcher)
 */
function countInputFields(data: z.infer<typeof checkDuplicatesSchema>): number {
  let count = 0
  if (data.firstName) count++
  if (data.lastName) count++
  if (data.email) count++
  if (data.phone) count++
  if (data.dateOfBirth) count++
  if (data.address || data.city || data.zipCode) count++
  if (data.tinLast4) count++
  return count
}

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const result = checkDuplicatesSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const data = result.data

  // Need at least one searchable field
  if (!data.firstName && !data.lastName && !data.email && !data.phone) {
    return { matches: [] }
  }

  const matches = await findDuplicates(data)
  const fieldCount = countInputFields(data)

  // Cap confidence based on how many fields the user has provided:
  // 1 field → suppress entirely (too many false positives)
  // 2 fields → cap at "medium" (suggestive but not definitive)
  // 3+ fields → trust the matcher's classification
  if (fieldCount <= 1) {
    return { matches: [] }
  }

  const maxConfidence: 'high' | 'medium' = fieldCount >= 3 ? 'high' : 'medium'

  return {
    matches: matches
      .map((m: MatchCandidate) => {
        let score = Math.round(m.adjustedScore * 100)
        let confidence = m.confidence
        if (confidence === 'high' && maxConfidence === 'medium') {
          confidence = 'medium'
          // Cap displayed score to match — "100% medium" looks contradictory
          score = Math.min(score, 84)
        }
        return {
          personId: m.personId,
          personName: m.personName,
          confidence,
          adjustedScore: score,
          topFields: m.fieldScores
            .filter(f => f.score > 0 && f.method !== 'missing')
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(f => ({
              field: f.field,
              score: Math.round(f.score * 100),
              method: f.method,
              details: f.details
            }))
        }
      })
      .filter(m => m.confidence !== 'low')
  }
})
