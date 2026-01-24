// Get notes for any entity type
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const query = getQuery(event)
  const entityType = query.entityType as string
  const entityId = query.entityId as string

  if (!entityType || !entityId) {
    throw createError({
      statusCode: 400,
      message: 'entityType and entityId are required'
    })
  }

  // Validate entity type
  const validEntityTypes = ['client', 'matter', 'document', 'appointment', 'journey']
  if (!validEntityTypes.includes(entityType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all notes for this entity with creator info
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
      eq(schema.notes.entityType, entityType),
      eq(schema.notes.entityId, entityId)
    ))
    .orderBy(desc(schema.notes.createdAt))
    .all()

  // Transform to include creator name
  const notes = notesWithCreator.map(note => ({
    id: note.id,
    content: note.content,
    entityType: note.entityType,
    entityId: note.entityId,
    createdBy: note.createdBy,
    creatorName: note.creatorFirstName && note.creatorLastName
      ? `${note.creatorFirstName} ${note.creatorLastName}`
      : 'Unknown',
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  }))

  return { notes }
})
