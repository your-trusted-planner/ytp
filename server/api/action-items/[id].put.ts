/**
 * Update an action item
 */
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const actionItemId = getRouterParam(event, 'id')
  if (!actionItemId) {
    throw createError({ statusCode: 400, message: 'Action item ID required' })
  }

  const body = await readBody(event)
  const db = useDrizzle()

  // Verify action item exists
  const existing = await db.select().from(schema.actionItems)
    .where(eq(schema.actionItems.id, actionItemId)).get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Action item not found' })
  }

  // Update action item
  const updateData: any = {
    updatedAt: new Date()
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.actionType !== undefined) updateData.actionType = body.actionType
  if (body.config !== undefined) updateData.config = body.config ? JSON.stringify(body.config) : null
  if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.status !== undefined) updateData.status = body.status
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null

  // System integration fields
  if (body.systemIntegrationType !== undefined) updateData.systemIntegrationType = body.systemIntegrationType
  if (body.resourceId !== undefined) updateData.resourceId = body.resourceId
  if (body.automationHandler !== undefined) updateData.automationHandler = body.automationHandler

  // Verification fields
  if (body.isServiceDeliveryVerification !== undefined) updateData.isServiceDeliveryVerification = body.isServiceDeliveryVerification
  if (body.verificationCriteria !== undefined) updateData.verificationCriteria = body.verificationCriteria ? JSON.stringify(body.verificationCriteria) : null

  await db.update(schema.actionItems)
    .set(updateData)
    .where(eq(schema.actionItems.id, actionItemId))

  const updated = await db.select().from(schema.actionItems)
    .where(eq(schema.actionItems.id, actionItemId)).get()

  return {
    actionItem: {
      ...updated,
      dueDate: updated.dueDate?.getTime() || null,
      completedAt: updated.completedAt?.getTime() || null,
      createdAt: updated.createdAt?.getTime() || Date.now(),
      updatedAt: updated.updatedAt?.getTime() || Date.now()
    }
  }
})
