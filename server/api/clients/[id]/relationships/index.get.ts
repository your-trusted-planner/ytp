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

  const db = hubDatabase()

  // Get all relationships with person details
  const relationships = await db.prepare(`
    SELECT
      cr.id,
      cr.client_id,
      cr.person_id,
      cr.relationship_type,
      cr.ordinal,
      cr.notes,
      cr.created_at,
      cr.updated_at,
      p.first_name,
      p.last_name,
      p.full_name,
      p.email,
      p.phone,
      p.entity_name,
      p.entity_type
    FROM client_relationships cr
    JOIN people p ON cr.person_id = p.id
    WHERE cr.client_id = ?
    ORDER BY cr.relationship_type, cr.ordinal, p.full_name
  `).bind(clientId).all()

  return {
    relationships: relationships.results?.map((r: any) => ({
      id: r.id,
      clientId: r.client_id,
      personId: r.person_id,
      relationshipType: r.relationship_type,
      ordinal: r.ordinal,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      person: {
        id: r.person_id,
        firstName: r.first_name,
        lastName: r.last_name,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        entityName: r.entity_name,
        entityType: r.entity_type
      }
    })) || []
  }
})
