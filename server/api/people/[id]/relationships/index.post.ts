import { nanoid } from 'nanoid'

// Add a relationship from a person to another person (unified relationships table)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const fromPersonId = getRouterParam(event, 'id')
  if (!fromPersonId) {
    throw createError({ statusCode: 400, message: 'Person ID required' })
  }

  const body = await readBody(event)
  const { toPersonId, relationshipType, ordinal, notes } = body

  if (!toPersonId || !relationshipType) {
    throw createError({ statusCode: 400, message: 'toPersonId and relationshipType are required' })
  }

  if (toPersonId === fromPersonId) {
    throw createError({ statusCode: 400, message: 'Cannot create a relationship with oneself' })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify both people exist
  const [fromPerson, toPerson] = await Promise.all([
    db.select({ id: schema.people.id }).from(schema.people).where(eq(schema.people.id, fromPersonId)).get(),
    db.select({ id: schema.people.id }).from(schema.people).where(eq(schema.people.id, toPersonId)).get()
  ])

  if (!fromPerson) throw createError({ statusCode: 404, message: 'Person not found' })
  if (!toPerson) throw createError({ statusCode: 404, message: 'Related person not found' })

  const id = nanoid()
  const now = new Date()

  await db.insert(schema.relationships).values({
    id,
    fromPersonId,
    toPersonId,
    relationshipType,
    ordinal: ordinal || 0,
    notes: notes || null,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    relationship: { id, fromPersonId, toPersonId, relationshipType, ordinal: ordinal || 0, notes }
  }
})
