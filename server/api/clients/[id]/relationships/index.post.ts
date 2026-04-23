import { nanoid } from 'nanoid'

// Create a client relationship (stored in unified relationships table)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Client ID required' })
  }

  const body = await readBody(event)
  const { personId, relationshipType, ordinal, notes } = body

  if (!personId || !relationshipType) {
    throw createError({ statusCode: 400, message: 'Person ID and relationship type required' })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq } = await import('drizzle-orm')
  const { resolveClientIds } = await import('../../../../utils/client-ids')
  const db = useDrizzle()

  const resolved = await resolveClientIds(clientId)
  if (!resolved) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  if (personId === resolved.personId) {
    throw createError({ statusCode: 400, message: 'Cannot create a relationship with oneself' })
  }

  const person = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  const id = nanoid()
  const now = new Date()

  await db.insert(schema.relationships).values({
    id,
    fromPersonId: resolved.personId,
    toPersonId: personId,
    relationshipType,
    ordinal: ordinal || 0,
    notes: notes || null,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    relationship: { id, clientId, personId, relationshipType, ordinal: ordinal || 0, notes, createdAt: now.getTime(), updatedAt: now.getTime() }
  }
})
