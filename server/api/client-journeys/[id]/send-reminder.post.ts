// Send a reminder to client about their current step
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const clientJourneyId = getRouterParam(event, 'id')

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get client journey
  const clientJourney = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, clientJourneyId))
    .get()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Get client info
  const client = await db.select({
    email: schema.users.email,
    firstName: schema.users.firstName
  })
    .from(schema.users)
    .where(eq(schema.users.id, clientJourney.clientId))
    .get()

  // Get current step name if exists
  let currentStepName = null
  if (clientJourney.currentStepId) {
    const step = await db.select({ name: schema.journeySteps.name })
      .from(schema.journeySteps)
      .where(eq(schema.journeySteps.id, clientJourney.currentStepId))
      .get()
    currentStepName = step?.name
  }

  // Get journey name
  const journey = await db.select({ name: schema.journeys.name })
    .from(schema.journeys)
    .where(eq(schema.journeys.id, clientJourney.journeyId))
    .get()

  // TODO: Implement email sending
  // For now, just log the reminder
  console.log('Sending reminder to:', client?.email)
  console.log('About:', journey?.name, '-', currentStepName)

  return { success: true }
})



