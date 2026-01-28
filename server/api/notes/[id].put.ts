// Update a note
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import type { EntityType } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const noteId = getRouterParam(event, 'id')

  if (!noteId) {
    throw createError({
      statusCode: 400,
      message: 'Note ID is required'
    })
  }

  const body = await readBody(event)
  const { content } = body

  if (!content || !content.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Note content is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get the note to check ownership and get entity info for logging
  const [note] = await db.select()
    .from(schema.notes)
    .where(eq(schema.notes.id, noteId))
    .all()

  if (!note) {
    throw createError({
      statusCode: 404,
      message: 'Note not found'
    })
  }

  // Only allow editing by the creator or an admin
  const isAdmin = user.adminLevel >= 2
  const isCreator = note.createdBy === user.id

  if (!isAdmin && !isCreator) {
    throw createError({
      statusCode: 403,
      message: 'You can only edit notes you created'
    })
  }

  // Use centralized entity resolver for name lookup
  const entityName = await resolveEntityName(note.entityType as EntityType, note.entityId)

  const now = new Date()

  // Update the note
  await db.update(schema.notes)
    .set({
      content: content.trim(),
      updatedAt: now
    })
    .where(eq(schema.notes.id, noteId))

  // Log the activity with structured entity references
  await logActivity({
    type: 'NOTE_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: entityName ? { type: note.entityType as EntityType, id: note.entityId, name: entityName } : undefined,
    relatedEntities: [
      { type: 'note', id: noteId, name: 'Note' }
    ],
    event,
    details: {
      contentPreview: content.trim().substring(0, 100)
    }
  })

  // Fetch the updated note with creator info
  const [updatedNote] = await db.select({
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
    .where(eq(schema.notes.id, noteId))
    .all()

  return {
    note: {
      id: updatedNote.id,
      content: updatedNote.content,
      entityType: updatedNote.entityType,
      entityId: updatedNote.entityId,
      createdBy: updatedNote.createdBy,
      creatorName: updatedNote.creatorFirstName && updatedNote.creatorLastName
        ? `${updatedNote.creatorFirstName} ${updatedNote.creatorLastName}`
        : 'Unknown',
      createdAt: updatedNote.createdAt,
      updatedAt: updatedNote.updatedAt
    }
  }
})
