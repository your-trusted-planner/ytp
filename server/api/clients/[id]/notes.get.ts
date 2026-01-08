// Get all notes for a client
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all notes for this client
  const notes = await db.select()
    .from(schema.notes)
    .where(eq(schema.notes.clientId, clientId))
    .orderBy(desc(schema.notes.createdAt))
    .all()

  return {
    notes
  }
})



