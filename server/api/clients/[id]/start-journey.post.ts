// Start an engagement journey for a client
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { initiateEngagementJourney } from '../../../utils/journey-initiator'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])
  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({ statusCode: 400, message: 'Client ID is required' })
  }

  const body = await readBody(event)
  if (!body.journeyTemplateId) {
    throw createError({ statusCode: 400, message: 'Journey template ID is required' })
  }

  const db = useDrizzle()

  // Get the client's personId
  const client = await db.select({ personId: schema.clients.personId })
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .get()

  if (!client) {
    throw createError({ statusCode: 404, message: 'Client not found' })
  }

  const result = await initiateEngagementJourney({
    personId: client.personId,
    journeyTemplateId: body.journeyTemplateId,
    initiatedBy: user.id,
    event
  })

  return {
    success: true,
    clientJourneyId: result.clientJourneyId,
    actionItemsCreated: result.actionItemsCreated
  }
})
