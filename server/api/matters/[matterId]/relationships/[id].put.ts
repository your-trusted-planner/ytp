// Update a matter relationship
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'matterId')
  const relationshipId = getRouterParam(event, 'id')

  if (!matterId || !relationshipId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID and relationship ID required'
    })
  }

  const body = await readBody(event)
  const { relationshipType, ordinal, notes } = body

  const db = hubDatabase()

  // Verify relationship exists and belongs to this matter
  const existing = await db.prepare(
    'SELECT id FROM matter_relationships WHERE id = ? AND matter_id = ?'
  ).bind(relationshipId, matterId).first()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Relationship not found'
    })
  }

  const now = Date.now()

  await db.prepare(`
    UPDATE matter_relationships
    SET
      relationship_type = ?,
      ordinal = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    relationshipType,
    ordinal !== undefined ? ordinal : 0,
    notes || null,
    now,
    relationshipId
  ).run()

  return {
    success: true,
    relationship: {
      id: relationshipId,
      matterId,
      relationshipType,
      ordinal,
      notes,
      updatedAt: now
    }
  }
})
