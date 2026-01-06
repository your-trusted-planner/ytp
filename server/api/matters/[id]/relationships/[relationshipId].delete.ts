// Delete a matter relationship
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'id')
  const relationshipId = getRouterParam(event, 'relationshipId')

  if (!matterId || !relationshipId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID and relationship ID required'
    })
  }

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

  await db.prepare('DELETE FROM matter_relationships WHERE id = ?')
    .bind(relationshipId)
    .run()

  return {
    success: true,
    message: 'Relationship deleted successfully'
  }
})
