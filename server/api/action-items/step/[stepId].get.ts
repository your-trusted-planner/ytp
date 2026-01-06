/**
 * Get all action items for a journey step (template level)
 */
import { eq, isNull } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const stepId = getRouterParam(event, 'stepId')
  if (!stepId) {
    throw createError({ statusCode: 400, message: 'Step ID required' })
  }

  const db = useDrizzle()

  // Verify step exists
  const step = await db.select().from(schema.journeySteps)
    .where(eq(schema.journeySteps.id, stepId)).get()

  if (!step) {
    throw createError({ statusCode: 404, message: 'Journey step not found' })
  }

  // Get all action items for this step (template level, where client_journey_id is null)
  const actionItems = await db.select()
    .from(schema.actionItems)
    .where(eq(schema.actionItems.stepId, stepId))
    .all()

  return {
    actionItems: actionItems.map((item) => ({
      ...item,
      dueDate: item.dueDate?.getTime() || null,
      completedAt: item.completedAt?.getTime() || null,
      createdAt: item.createdAt?.getTime() || Date.now(),
      updatedAt: item.updatedAt?.getTime() || Date.now()
    }))
  }
})
