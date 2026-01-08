// Start a client on a journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, ne } = await import('drizzle-orm')
  const db = useDrizzle()

  // Validate that matter and catalog are provided
  if (!body.matterId || !body.catalogId) {
    throw createError({
      statusCode: 400,
      message: 'Matter and service are required to start a journey'
    })
  }

  // Validate that the service is engaged for this matter
  const engagement = await db.select()
    .from(schema.mattersToServices)
    .where(and(
      eq(schema.mattersToServices.matterId, body.matterId),
      eq(schema.mattersToServices.catalogId, body.catalogId)
    ))
    .get()

  if (!engagement) {
    throw createError({
      statusCode: 400,
      message: 'This service is not engaged for the selected matter. Please engage the service first.'
    })
  }

  // Check if a journey already exists for this engagement
  const existingJourney = await db.select()
    .from(schema.clientJourneys)
    .where(and(
      eq(schema.clientJourneys.matterId, body.matterId),
      eq(schema.clientJourneys.catalogId, body.catalogId),
      ne(schema.clientJourneys.status, 'CANCELLED')
    ))
    .get()

  if (existingJourney) {
    throw createError({
      statusCode: 400,
      message: 'A journey already exists for this service engagement'
    })
  }

  // Get the first step of the journey
  const firstStep = await db.select({ id: schema.journeySteps.id })
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.journeyId, body.journeyId))
    .orderBy(schema.journeySteps.stepOrder)
    .limit(1)
    .get()

  const clientJourneyId = nanoid()
  const now = new Date()

  await db.insert(schema.clientJourneys).values({
    id: clientJourneyId,
    clientId: body.clientId,
    matterId: body.matterId,
    catalogId: body.catalogId,
    journeyId: body.journeyId,
    currentStepId: firstStep?.id || null,
    status: 'IN_PROGRESS',
    priority: body.priority || 'MEDIUM',
    startedAt: now,
    completedAt: null,
    pausedAt: null,
    createdAt: now,
    updatedAt: now
  })

  // Create progress record for the first step
  if (firstStep) {
    await db.insert(schema.journeyStepProgress).values({
      id: nanoid(),
      clientJourneyId: clientJourneyId,
      stepId: firstStep.id,
      status: 'IN_PROGRESS',
      clientApproved: false,
      attorneyApproved: false,
      iterationCount: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })
  }

  // Return clientJourney object for compatibility
  return {
    clientJourney: {
      id: clientJourneyId,
      client_id: body.clientId,
      matter_id: body.matterId,
      catalog_id: body.catalogId,
      journey_id: body.journeyId,
      current_step_id: firstStep?.id || null,
      status: 'IN_PROGRESS',
      priority: body.priority || 'MEDIUM',
      started_at: now.getTime(),
      completed_at: null,
      paused_at: null,
      created_at: now.getTime(),
      updated_at: now.getTime()
    }
  }
})



