// Get all action items for a client journey
import { eq, desc, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'

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

  return {
    actionItems: actionItems.map((row) => ({
      ...row.actionItem,
      dueDate: row.actionItem.dueDate?.getTime() || null,
      completedAt: row.actionItem.completedAt?.getTime() || null,
      createdAt: row.actionItem.createdAt?.getTime() || Date.now(),
      updatedAt: row.actionItem.updatedAt?.getTime() || Date.now(),
      completedByFirstName: row.completedByUser?.firstName || null,
      completedByLastName: row.completedByUser?.lastName || null
    }))
  }
})



