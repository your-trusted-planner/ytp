// Post a message in a bridge conversation
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const body = await readBody(event)

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const messageId = nanoid()
  const now = new Date()

  await db.insert(schema.bridgeConversations).values({
    id: messageId,
    stepProgressId: body.stepProgressId,
    userId: user.id,
    message: body.message,
    isAiResponse: false,
    metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    createdAt: now
  })

  const message = {
    id: messageId,
    step_progress_id: body.stepProgressId,
    user_id: user.id,
    message: body.message,
    is_ai_response: false,
    metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    created_at: now
  }

  return { message }
})



