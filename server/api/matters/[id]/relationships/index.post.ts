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

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify matter exists
  const matter = await db.select({ id: schema.matters.id })
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .get()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

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

  await db.insert(schema.matterRelationships).values({
    id: relationshipId,
    matterId,
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
      matterId,
      personId,
      relationshipType,
      ordinal: ordinal || 0,
      notes,
      createdAt: now.getTime(),
      updatedAt: now.getTime()
    }
  }
})
