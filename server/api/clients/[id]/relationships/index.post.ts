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

  const db = hubDatabase()

  // Verify client exists
  const client = await db.prepare('SELECT id FROM users WHERE id = ? AND role = ?')
    .bind(clientId, 'CLIENT')
    .first()

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Verify person exists
  const person = await db.prepare('SELECT id FROM people WHERE id = ?')
    .bind(personId)
    .first()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  const relationshipId = nanoid()
  const now = Date.now()

  await db.prepare(`
    INSERT INTO client_relationships (
      id, client_id, person_id, relationship_type, ordinal, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    relationshipId,
    clientId,
    personId,
    relationshipType,
    ordinal || 0,
    notes || null,
    now,
    now
  ).run()

  return {
    success: true,
    relationship: {
      id: relationshipId,
      clientId,
      personId,
      relationshipType,
      ordinal: ordinal || 0,
      notes,
      createdAt: now,
      updatedAt: now
    }
  }
})
