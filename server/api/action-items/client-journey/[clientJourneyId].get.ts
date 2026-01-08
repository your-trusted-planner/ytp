// Get all action items for a client journey
import { eq, desc, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const clientJourneyId = getRouterParam(event, 'clientJourneyId')

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const db = useDrizzle()

  // Get client journey to check authorization
  const clientJourney = await db
    .select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, clientJourneyId))
    .get()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Check authorization - clients can only view their own journey's action items
  requireClientAccess(event, clientJourney.clientId)

  // Get all action items for this client journey with completed user info
  const actionItems = await db
    .select({
      actionItem: schema.actionItems,
      completedByUser: {
        firstName: schema.users.firstName,
        lastName: schema.users.lastName
      }
    })
    .from(schema.actionItems)
    .leftJoin(schema.users, eq(schema.actionItems.completedBy, schema.users.id))
    .where(eq(schema.actionItems.clientJourneyId, clientJourneyId))
    .orderBy(
      desc(schema.actionItems.priority),
      asc(schema.actionItems.dueDate),
      asc(schema.actionItems.createdAt)
    )
    .all()

  // Convert to snake_case for API compatibility
  return {
    actionItems: actionItems.map((row) => {
      const item = row.actionItem
      return {
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
        updated_at: item.updatedAt instanceof Date ? item.updatedAt.getTime() : item.updatedAt,
        completed_by_first_name: row.completedByUser?.firstName || null,
        completed_by_last_name: row.completedByUser?.lastName || null
      }
    })
  }
})



