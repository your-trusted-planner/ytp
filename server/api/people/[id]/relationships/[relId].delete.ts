// Delete a relationship from the person detail view
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  const relId = getRouterParam(event, 'relId')

  if (!personId || !relId) {
    throw createError({ statusCode: 400, message: 'Person ID and relationship ID required' })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const { eq, and, or } = await import('drizzle-orm')
  const db = useDrizzle()

  // Verify the person exists
  const person = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  // Find the relationship — must involve this person on either side
  const match = await db.select({ id: schema.relationships.id })
    .from(schema.relationships)
    .where(and(
      eq(schema.relationships.id, relId),
      or(
        eq(schema.relationships.fromPersonId, personId),
        eq(schema.relationships.toPersonId, personId)
      )
    ))
    .get()

  if (!match) {
    throw createError({ statusCode: 404, message: 'Relationship not found' })
  }

  await db.delete(schema.relationships)
    .where(eq(schema.relationships.id, relId))

  return { success: true, message: 'Relationship deleted successfully' }
})
