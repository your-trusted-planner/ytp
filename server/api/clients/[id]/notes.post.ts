// Add a note to a client
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  const noteId = nanoid()
  const now = new Date()

  await db.insert(schema.notes).values({
    id: noteId,
    content: body.content,
    clientId: clientId,
    createdAt: now,
    updatedAt: now
  })

  return {
    note: {
      id: noteId,
      content: body.content,
      client_id: clientId,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})



