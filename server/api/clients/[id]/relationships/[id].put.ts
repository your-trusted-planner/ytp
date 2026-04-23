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
  const { eq, and, or } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../../../utils/client-ids')
  const db = useDrizzle()

  const resolved = await resolveClientIds(clientId)
  if (!resolved) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  // Verify relationship exists and belongs to this client
  const existing = await db.select({ id: schema.relationships.id })
    .from(schema.relationships)
    .where(and(
      eq(schema.relationships.id, relationshipId),
      or(
        eq(schema.relationships.fromPersonId, resolved.personId),
        eq(schema.relationships.toPersonId, resolved.personId)
      )
    ))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Relationship not found'
    })
  }

  const now = new Date()

  await db.update(schema.relationships)
    .set({
      relationshipType,
      ordinal: ordinal !== undefined ? ordinal : 0,
      notes: notes || null,
      updatedAt: now
    })
    .where(eq(schema.relationships.id, relationshipId))

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
