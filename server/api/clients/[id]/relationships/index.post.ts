import { nanoid } from 'nanoid'

// Create a client relationship
export default defineEventHandler(async (event) => {
  // Auth middleware ensures user is authenticated
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID required'
    })
  }

  const body = await readBody(event)
  const { personId, relationshipType, ordinal, notes } = body

  console.info('Request body:', { personId, relationshipType, ordinal })

  if (!personId || !relationshipType) {
    throw createError({
      statusCode: 400,
      message: 'Person ID and relationship type required'
    })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, and } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../../../utils/client-ids')
  const db = useDrizzle()

  // Resolve clients.id → users.id (clientRelationships.clientId references users.id)
  const resolved = await resolveClientIds(clientId)

  if (!resolved || resolved.userIds.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const legacyClientId = resolved.userIds[0]

  // Verify person exists
  const person = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  const relationshipId = nanoid()
  const now = new Date()

  await db.insert(schema.clientRelationships).values({
    id: relationshipId,
    clientId: legacyClientId,
    personId,
    relationshipType,
    ordinal: ordinal || 0,
    notes: notes || null,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    relationship: {
      id: relationshipId,
      clientId,
      personId,
      relationshipType,
      ordinal: ordinal || 0,
      notes,
      createdAt: now.getTime(),
      updatedAt: now.getTime()
    }
  }
})
