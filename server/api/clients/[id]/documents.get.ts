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
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // documents.clientId now references clients.id directly — URL param is clients.id
  const documents = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.clientId, clientId))
    .orderBy(desc(schema.documents.createdAt))
    .all()

  return {
    documents
  }
})
