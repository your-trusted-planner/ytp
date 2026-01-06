/**
 * Delete an action item
 */
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const actionItemId = getRouterParam(event, 'id')
  if (!actionItemId) {
    throw createError({ statusCode: 400, message: 'Action item ID required' })
  }

  const db = useDrizzle()

  // Verify action item exists
  const existing = await db.select().from(schema.actionItems)
    .where(eq(schema.actionItems.id, actionItemId)).get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Action item not found' })
  }

  // Delete action item
  await db.delete(schema.actionItems)
    .where(eq(schema.actionItems.id, actionItemId))

  return { success: true }
})
