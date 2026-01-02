// Add a note to a client
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can add notes
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()

  const note = {
    id: nanoid(),
    content: body.content,
    client_id: clientId,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO notes (id, content, client_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    note.id,
    note.content,
    note.client_id,
    note.created_at,
    note.updated_at
  ).run()

  return { note }
})



