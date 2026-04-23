/**
 * Relationship type inversion for bidirectional display.
 *
 * Symmetric types (SPOUSE, SIBLING, etc.) map to themselves.
 * Directional types (CHILD→PARENT, etc.) map to their inverse.
 * Asymmetric types (FINANCIAL_ADVISOR, TRUSTEE, etc.) are NOT in this map —
 * they only display from the perspective of the person who initiated the relationship
 * (fromPersonId). No reciprocal row is generated for those.
 */
const RELATIONSHIP_INVERSES: Record<string, string> = {
  SPOUSE: 'SPOUSE',
  EX_SPOUSE: 'EX_SPOUSE',
  PARTNER: 'PARTNER',
  CHILD: 'PARENT',
  PARENT: 'CHILD',
  STEPCHILD: 'STEPPARENT',
  STEPPARENT: 'STEPCHILD',
  GRANDCHILD: 'GRANDPARENT',
  GRANDPARENT: 'GRANDCHILD',
  SIBLING: 'SIBLING',
  BUSINESS_PARTNER: 'BUSINESS_PARTNER',
  BUSINESS_ASSOCIATE: 'BUSINESS_ASSOCIATE',
}

/**
 * Returns the inverse relationship type, or null for asymmetric types
 * (meaning no reciprocal row should be generated).
 */
export function invertRelationshipType(type: string): string | null {
  return RELATIONSHIP_INVERSES[type] ?? null
}

/**
 * Given a set of relationships rows from the `relationships` table and the
 * personId of the viewer, returns normalised rows always from that person's
 * perspective: personId is the *other* party, relationshipType is what the
 * viewer calls that person.
 *
 * Asymmetric rows where the viewer is toPersonId are omitted (the initiator
 * chose the label; the recipient has no meaningful inverse label).
 */
export function normalizeRelationshipsForPerson(
  rows: Array<{
    id: string
    fromPersonId: string
    toPersonId: string
    relationshipType: string
    ordinal: number
    notes: string | null
    createdAt: Date | number | null
    updatedAt: Date | number | null
  }>,
  viewerPersonId: string
): Array<{
  id: string
  personId: string
  relationshipType: string
  ordinal: number
  notes: string | null
  createdAt: Date | number | null
  updatedAt: Date | number | null
}> {
  const result = []

  for (const r of rows) {
    if (r.fromPersonId === viewerPersonId) {
      // Viewer initiated — show as stored
      result.push({
        id: r.id,
        personId: r.toPersonId,
        relationshipType: r.relationshipType,
        ordinal: r.ordinal,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })
    }
    else {
      // Viewer is the recipient — show inverted (symmetric types only)
      const inverse = invertRelationshipType(r.relationshipType)
      if (inverse) {
        result.push({
          id: r.id,
          personId: r.fromPersonId,
          relationshipType: inverse,
          ordinal: r.ordinal,
          notes: r.notes,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        })
      }
    }
  }

  return result
}
