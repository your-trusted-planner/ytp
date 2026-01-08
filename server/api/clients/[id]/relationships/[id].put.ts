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

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify relationship exists and belongs to this client
  const existing = await db.select({ id: schema.clientRelationships.id })
    .from(schema.clientRelationships)
    .where(and(
      eq(schema.clientRelationships.id, relationshipId),
      eq(schema.clientRelationships.clientId, clientId)
    ))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Relationship not found'
    })
  }

  const now = new Date()

  await db.update(schema.clientRelationships)
    .set({
      relationshipType,
      ordinal: ordinal !== undefined ? ordinal : 0,
      notes: notes || null,
      updatedAt: now
    })
    .where(eq(schema.clientRelationships.id, relationshipId))

  return {
    success: true,
    relationship: {
      id: relationshipId,
      clientId,
      relationshipType,
      ordinal,
      notes,
      updatedAt: now.getTime()
    }
  }
})
