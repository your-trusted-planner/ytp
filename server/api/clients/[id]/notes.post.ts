// Add a note to a client (convenience wrapper around generic notes API)
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const body = await readBody(event)

  if (!body.content || !body.content.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Note content is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const noteId = nanoid()
  const now = new Date()

  await db.insert(schema.notes).values({
    id: noteId,
    content: body.content.trim(),
    entityType: 'client',
    entityId: clientId,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now
  })

  // Fetch the created note with creator info
  const [createdNote] = await db.select({
    id: schema.notes.id,
    content: schema.notes.content,
    createdBy: schema.notes.createdBy,
    createdAt: schema.notes.createdAt,
    updatedAt: schema.notes.updatedAt,
    creatorFirstName: schema.users.firstName,
    creatorLastName: schema.users.lastName
  })
    .from(schema.notes)
    .leftJoin(schema.users, eq(schema.notes.createdBy, schema.users.id))
    .where(eq(schema.notes.id, noteId))
    .all()

  return {
    note: {
      id: createdNote.id,
      content: createdNote.content,
      createdBy: createdNote.createdBy,
      creatorName: createdNote.creatorFirstName && createdNote.creatorLastName
        ? `${createdNote.creatorFirstName} ${createdNote.creatorLastName}`
        : 'Unknown',
      createdAt: createdNote.createdAt,
      updatedAt: createdNote.updatedAt
    }
  }
})
