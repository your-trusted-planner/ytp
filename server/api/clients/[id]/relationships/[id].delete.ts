// Delete a client relationship
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  // Parse nested route params
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

  await db.prepare('DELETE FROM client_relationships WHERE id = ?')
    .bind(relationshipId)
    .run()

  return {
    success: true,
    message: 'Relationship deleted successfully'
  }
})
