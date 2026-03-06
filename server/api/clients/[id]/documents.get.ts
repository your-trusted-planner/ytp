// Get all documents for a client
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
  const { eq, or, desc } = await import('drizzle-orm')
  const { getLegacyClientIds } = await import('../../../utils/client-ids')
  const db = useDrizzle()

  // documents.clientId references users.id, but URL param is clients.id
  const allIds = await getLegacyClientIds(clientId)

  // Get all documents for this client
  const documents = await db.select()
    .from(schema.documents)
    .where(or(...allIds.map(id => eq(schema.documents.clientId, id))))
    .orderBy(desc(schema.documents.createdAt))
    .all()

  return {
    documents
  }
})



