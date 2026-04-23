// Get all relationships for a client
export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Client ID required' })
  }

  // Authorization: lawyers/admins can view any client's relationships, clients only their own
  requireClientAccess(event, clientId)

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, or, inArray } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../../../utils/client-ids')
  const { normalizeRelationshipsForPerson } = await import('../../../../utils/relationships')
  const db = useDrizzle()

  const resolved = await resolveClientIds(clientId)
  if (!resolved) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  const rawRows = await db.select()
    .from(schema.relationships)
    .where(or(
      eq(schema.relationships.fromPersonId, resolved.personId),
      eq(schema.relationships.toPersonId, resolved.personId)
    ))
    .orderBy(schema.relationships.relationshipType, schema.relationships.ordinal)
    .all()

  const normalized = normalizeRelationshipsForPerson(rawRows, resolved.personId)

  if (normalized.length === 0) {
    return { relationships: [] }
  }

  const personIds = [...new Set(normalized.map(r => r.personId))]
  const people = await db.select()
    .from(schema.people)
    .where(inArray(schema.people.id, personIds))
    .all()

  const personMap = new Map(people.map(p => [p.id, p]))

  const enriched = normalized.map((r) => {
    const person = personMap.get(r.personId)
    return {
      id: r.id,
      client_id: clientId,
      person_id: r.personId,
      // camelCase (for template access)
      relationshipType: r.relationshipType,
      // snake_case (legacy compat)
      relationship_type: r.relationshipType,
      ordinal: r.ordinal,
      notes: r.notes,
      created_at: r.createdAt instanceof Date ? r.createdAt.getTime() : r.createdAt,
      updated_at: r.updatedAt instanceof Date ? r.updatedAt.getTime() : r.updatedAt,
      person: person
        ? {
            id: person.id,
            // camelCase
            fullName: person.fullName,
            // snake_case (legacy compat)
            first_name: person.firstName,
            last_name: person.lastName,
            full_name: person.fullName,
            email: person.email,
            phone: person.phone
          }
        : null
    }
  })

  return { relationships: enriched }
})
