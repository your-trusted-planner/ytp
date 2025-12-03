// Post a message in a bridge conversation
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody(event)
  const db = hubDatabase()
  
  const message = {
    id: nanoid(),
    step_progress_id: body.stepProgressId,
    user_id: user.id,
    message: body.message,
    is_ai_response: 0,
    metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    created_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO bridge_conversations (
      id, step_progress_id, user_id, message, is_ai_response, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    message.id,
    message.step_progress_id,
    message.user_id,
    message.message,
    message.is_ai_response,
    message.metadata,
    message.created_at
  ).run()

  return { message }
})

