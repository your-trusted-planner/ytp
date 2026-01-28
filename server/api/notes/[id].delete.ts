// Delete a note
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

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get the note to check ownership
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

  // Only allow deletion by the creator or an admin
  const isAdmin = user.adminLevel >= 2
  const isCreator = note.createdBy === user.id

  if (!isAdmin && !isCreator) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete notes you created'
    })
  }

  // Use centralized entity resolver for name lookup
  const entityName = await resolveEntityName(note.entityType as EntityType, note.entityId)

  // Log the activity before deleting with structured entity references
  await logActivity({
    type: 'NOTE_DELETED',
    userId: user.id,
    userRole: user.role,
    target: entityName ? { type: note.entityType as EntityType, id: note.entityId, name: entityName } : undefined,
    relatedEntities: [
      { type: 'note', id: noteId, name: 'Note' }
    ],
    event,
    details: {
      contentPreview: note.content.substring(0, 100)
    }
  })

  await db.delete(schema.notes)
    .where(eq(schema.notes.id, noteId))

  return { success: true }
})
