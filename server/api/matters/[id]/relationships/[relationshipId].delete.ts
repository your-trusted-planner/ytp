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

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify relationship exists and belongs to this matter
  const existing = await db.select({ id: schema.matterRelationships.id })
    .from(schema.matterRelationships)
    .where(and(
      eq(schema.matterRelationships.id, relationshipId),
      eq(schema.matterRelationships.matterId, matterId)
    ))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Relationship not found'
    })
  }

  await db.delete(schema.matterRelationships)
    .where(eq(schema.matterRelationships.id, relationshipId))

  return {
    success: true,
    message: 'Relationship deleted successfully'
  }
})
