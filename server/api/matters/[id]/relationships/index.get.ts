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

  const db = hubDatabase()

  // Get all relationships with person details
  const relationships = await db.prepare(`
    SELECT
      mr.id,
      mr.matter_id,
      mr.person_id,
      mr.relationship_type,
      mr.ordinal,
      mr.notes,
      mr.created_at,
      mr.updated_at,
      p.first_name,
      p.last_name,
      p.full_name,
      p.email,
      p.phone,
      p.entity_name,
      p.entity_type
    FROM matter_relationships mr
    JOIN people p ON mr.person_id = p.id
    WHERE mr.matter_id = ?
    ORDER BY mr.relationship_type, mr.ordinal, p.full_name
  `).bind(matterId).all()

  return {
    relationships: relationships.results?.map((r: any) => ({
      id: r.id,
      matterId: r.matter_id,
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
