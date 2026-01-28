// Get all relationships for a client
export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID required'
    })
  }

  // Authorization: lawyers/admins can view any client's relationships, clients only their own
  requireClientAccess(event, clientId)

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all relationships for this client
  const clientRelationships = await db.select()
    .from(schema.clientRelationships)
    .where(eq(schema.clientRelationships.clientId, clientId))
    .orderBy(
      schema.clientRelationships.relationshipType,
      schema.clientRelationships.ordinal
    )
    .all()

  if (clientRelationships.length === 0) {
    return { relationships: [] }
  }

  // Get all people involved
  const personIds = [...new Set(clientRelationships.map(cr => cr.personId))]
  const people = await db.select()
    .from(schema.people)
    .where(inArray(schema.people.id, personIds))
    .all()

  // Create person lookup map
  const personMap = new Map(people.map(p => [p.id, p]))

  // Enrich relationships with person details and convert to snake_case
  const enrichedRelationships = clientRelationships.map(cr => {
    const person = personMap.get(cr.personId)
    return {
      id: cr.id,
      client_id: cr.clientId,
      person_id: cr.personId,
      relationship_type: cr.relationshipType,
      ordinal: cr.ordinal,
      notes: cr.notes,
      created_at: cr.createdAt instanceof Date ? cr.createdAt.getTime() : cr.createdAt,
      updated_at: cr.updatedAt instanceof Date ? cr.updatedAt.getTime() : cr.updatedAt,
      person: person ? {
        id: person.id,
        first_name: person.firstName,
        last_name: person.lastName,
        full_name: person.fullName,
        email: person.email,
        phone: person.phone
      } : null
    }
  })

  return {
    relationships: enrichedRelationships
  }
})
