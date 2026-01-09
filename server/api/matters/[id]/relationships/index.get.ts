// Get all relationships for a matter
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all relationships for this matter
  const matterRelationships = await db.select()
    .from(schema.matterRelationships)
    .where(eq(schema.matterRelationships.matterId, matterId))
    .orderBy(
      schema.matterRelationships.relationshipType,
      schema.matterRelationships.ordinal
    )
    .all()

  if (matterRelationships.length === 0) {
    return { relationships: [] }
  }

  // Get all people involved
  const personIds = [...new Set(matterRelationships.map(mr => mr.personId))]
  const people = await db.select()
    .from(schema.people)
    .where(inArray(schema.people.id, personIds))
    .all()

  // Create person lookup map
  const personMap = new Map(people.map(p => [p.id, p]))

  // Enrich relationships with person details and convert to snake_case
  const enrichedRelationships = matterRelationships.map(mr => {
    const person = personMap.get(mr.personId)
    return {
      id: mr.id,
      matter_id: mr.matterId,
      person_id: mr.personId,
      relationship_type: mr.relationshipType,
      ordinal: mr.ordinal,
      notes: mr.notes,
      created_at: mr.createdAt instanceof Date ? mr.createdAt.getTime() : mr.createdAt,
      updated_at: mr.updatedAt instanceof Date ? mr.updatedAt.getTime() : mr.updatedAt,
      person: person ? {
        id: person.id,
        first_name: person.firstName,
        last_name: person.lastName,
        full_name: person.fullName,
        email: person.email,
        phone: person.phone,
        entity_name: person.entityName,
        entity_type: person.entityType
      } : null
    }
  })

  return {
    relationships: enrichedRelationships
  }
})
