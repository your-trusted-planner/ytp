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
    throw createError({ statusCode: 400, message: 'Client ID and relationship ID required' })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, and, or } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../../../utils/client-ids')
  const db = useDrizzle()

  const resolved = await resolveClientIds(clientId)
  if (!resolved) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  const match = await db.select({ id: schema.relationships.id })
    .from(schema.relationships)
    .where(and(
      eq(schema.relationships.id, relationshipId),
      or(
        eq(schema.relationships.fromPersonId, resolved.personId),
        eq(schema.relationships.toPersonId, resolved.personId)
      )
    ))
    .get()

  if (!match) {
    throw createError({ statusCode: 404, message: 'Relationship not found' })
  }

  await db.delete(schema.relationships)
    .where(eq(schema.relationships.id, relationshipId))

  return { success: true, message: 'Relationship deleted successfully' }
})
