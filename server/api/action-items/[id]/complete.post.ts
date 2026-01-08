// Mark an action item as complete
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const actionItemId = getRouterParam(event, 'id')

  if (!actionItemId) {
    throw createError({
      statusCode: 400,
      message: 'Action item ID is required'
    })
  }

  const db = useDrizzle()
  const body = await readBody(event).catch(() => ({}))

  // Get the action item
  const actionItem = await db
    .select()
    .from(schema.actionItems)
    .where(eq(schema.actionItems.id, actionItemId))
    .get()

  if (!actionItem) {
    throw createError({
      statusCode: 404,
      message: 'Action item not found'
    })
  }

  // Mark as complete
  await db
    .update(schema.actionItems)
    .set({
      status: 'COMPLETE',
      completedAt: new Date(),
      completedBy: user.id,
      verificationEvidence: body.verificationEvidence ? JSON.stringify(body.verificationEvidence) : actionItem.verificationEvidence,
      updatedAt: new Date()
    })
    .where(eq(schema.actionItems.id, actionItemId))

  return { success: true }
})



