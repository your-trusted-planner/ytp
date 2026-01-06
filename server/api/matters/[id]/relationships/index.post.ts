import { nanoid } from 'nanoid'

// Create a matter relationship
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID required'
    })
  }

  const body = await readBody(event)
  const { personId, relationshipType, ordinal, notes } = body

  if (!personId || !relationshipType) {
    throw createError({
      statusCode: 400,
      message: 'Person ID and relationship type required'
    })
  }

  const db = hubDatabase()

  // Verify matter exists
  const matter = await db.prepare('SELECT id FROM matters WHERE id = ?')
    .bind(matterId)
    .first()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
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
    INSERT INTO matter_relationships (
      id, matter_id, person_id, relationship_type, ordinal, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    relationshipId,
    matterId,
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
      matterId,
      personId,
      relationshipType,
      ordinal: ordinal || 0,
      notes,
      createdAt: now,
      updatedAt: now
    }
  }
})
