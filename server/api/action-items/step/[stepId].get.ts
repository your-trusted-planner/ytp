/**
 * Get all action items for a journey step (template level)
 */
import { eq, isNull } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

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

  // Convert to snake_case for API compatibility
  return {
    actionItems: actionItems.map((item) => ({
      id: item.id,
      step_id: item.stepId,
      client_journey_id: item.clientJourneyId,
      action_type: item.actionType,
      title: item.title,
      description: item.description,
      config: item.config,
      status: item.status,
      assigned_to: item.assignedTo,
      due_date: item.dueDate instanceof Date ? item.dueDate.getTime() : item.dueDate,
      priority: item.priority,
      system_integration_type: item.systemIntegrationType,
      resource_id: item.resourceId,
      automation_handler: item.automationHandler,
      is_service_delivery_verification: item.isServiceDeliveryVerification ? 1 : 0,
      verification_criteria: item.verificationCriteria,
      verification_evidence: item.verificationEvidence,
      completed_at: item.completedAt instanceof Date ? item.completedAt.getTime() : item.completedAt,
      completed_by: item.completedBy,
      created_at: item.createdAt instanceof Date ? item.createdAt.getTime() : item.createdAt,
      updated_at: item.updatedAt instanceof Date ? item.updatedAt.getTime() : item.updatedAt
    }))
  }
})
