// Create a note for any entity type
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'
import type { EntityType } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const body = await readBody(event)
  const { entityType, entityId, content } = body

  if (!entityType || !entityId || !content) {
    throw createError({
      statusCode: 400,
      message: 'entityType, entityId, and content are required'
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
  const db = useDrizzle()

  // Use centralized entity resolver for name lookup
  const entityName = await resolveEntityName(entityType as EntityType, entityId)

  const noteId = nanoid()
  const now = new Date()

  await db.insert(schema.notes).values({
    id: noteId,
    content: content.trim(),
    entityType,
    entityId,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now
  })

  // Log the activity with structured entity references
  // Target is the parent entity, note is tracked in relatedEntities
  await logActivity({
    type: 'NOTE_CREATED',
    userId: user.id,
    userRole: user.role,
    target: entityName ? { type: entityType as EntityType, id: entityId, name: entityName } : undefined,
    relatedEntities: [
      { type: 'note', id: noteId, name: 'Note' }
    ],
    event,
    details: {
      contentPreview: content.trim().substring(0, 100)
    }
  })

  // Fetch the created note with creator info
  const [createdNote] = await db.select({
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
      id: createdNote.id,
      content: createdNote.content,
      entityType: createdNote.entityType,
      entityId: createdNote.entityId,
      createdBy: createdNote.createdBy,
      creatorName: createdNote.creatorFirstName && createdNote.creatorLastName
        ? `${createdNote.creatorFirstName} ${createdNote.creatorLastName}`
        : 'Unknown',
      createdAt: createdNote.createdAt,
      updatedAt: createdNote.updatedAt
    }
  }
})
