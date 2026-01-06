// Update a client relationship
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  // Note: In nested routes like /clients/[id]/relationships/[id],
  // we need to parse the path to get both IDs
  const pathParts = event.path.split('/')
  const clientIdIndex = pathParts.indexOf('clients') + 1
  const relationshipIdIndex = pathParts.indexOf('relationships') + 1

  const clientId = pathParts[clientIdIndex]
  const relationshipId = pathParts[relationshipIdIndex]

  if (!clientId || !relationshipId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID and relationship ID required'
    })
  }

  const body = await readBody(event)
  const { relationshipType, ordinal, notes } = body

  const db = hubDatabase()

  // Verify relationship exists and belongs to this client
  const existing = await db.prepare(
    'SELECT id FROM client_relationships WHERE id = ? AND client_id = ?'
  ).bind(relationshipId, clientId).first()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Relationship not found'
    })
  }

  const now = Date.now()

  await db.prepare(`
    UPDATE client_relationships
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
      clientId,
      relationshipType,
      ordinal,
      notes,
      updatedAt: now
    }
  }
})
