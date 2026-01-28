// Get all notes for a client (convenience wrapper around generic notes API)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all notes for this client with creator info
  const notesWithCreator = await db.select({
    id: schema.notes.id,
    content: schema.notes.content,
    entityType: schema.notes.entityType,
    entityId: schema.notes.entityId,
    createdBy: schema.notes.createdBy,
    createdAt: schema.notes.createdAt,
    updatedAt: schema.notes.updatedAt,
    creatorFirstName: schema.users.firstName,
    creatorLastName: schema.users.lastName
  })
    .from(schema.notes)
    .leftJoin(schema.users, eq(schema.notes.createdBy, schema.users.id))
    .where(and(
      eq(schema.notes.entityType, 'client'),
      eq(schema.notes.entityId, clientId)
    ))
    .orderBy(desc(schema.notes.createdAt))
    .all()

  // Transform to include creator name
  const notes = notesWithCreator.map(note => ({
    id: note.id,
    content: note.content,
    createdBy: note.createdBy,
    creatorName: note.creatorFirstName && note.creatorLastName
      ? `${note.creatorFirstName} ${note.creatorLastName}`
      : 'Unknown',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  }))

  return { notes }
})
