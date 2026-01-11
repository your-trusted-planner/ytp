// Advance a client to the next step in their journey
import { nanoid } from 'nanoid'

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
  const { eq, and, gt, ne } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get current journey and step
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

  // Get current step
  const currentStep = await db.select()
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.id, clientJourney.currentStepId))
    .get()

  if (!currentStep) {
    throw createError({
      statusCode: 400,
      message: 'Current step not found'
    })
  }

  const now = new Date()

  // Mark current step as complete
  await db.update(schema.journeyStepProgress)
    .set({
      status: 'COMPLETE',
      completedAt: now,
      updatedAt: now
    })
    .where(and(
      eq(schema.journeyStepProgress.clientJourneyId, clientJourneyId),
      eq(schema.journeyStepProgress.stepId, currentStep.id)
    ))

  // Get next step
  const nextStep = await db.select()
    .from(schema.journeySteps)
    .where(and(
      eq(schema.journeySteps.journeyId, clientJourney.journeyId),
      gt(schema.journeySteps.stepOrder, currentStep.stepOrder)
    ))
    .orderBy(schema.journeySteps.stepOrder)
    .limit(1)
    .get()

  if (nextStep) {
    // Update client journey to next step
    await db.update(schema.clientJourneys)
      .set({
        currentStepId: nextStep.id,
        updatedAt: now
      })
      .where(eq(schema.clientJourneys.id, clientJourneyId))

    // Create progress record for next step
    await db.insert(schema.journeyStepProgress).values({
      id: nanoid(),
      clientJourneyId: clientJourneyId,
      stepId: nextStep.id,
      status: 'IN_PROGRESS',
      clientApproved: false,
      attorneyApproved: false,
      iterationCount: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })

    return { success: true, nextStep }
  } else {
    // Journey is complete
    await db.update(schema.clientJourneys)
      .set({
        status: 'COMPLETED',
        completedAt: now,
        updatedAt: now
      })
      .where(eq(schema.clientJourneys.id, clientJourneyId))

    // Check if this was an engagement journey and auto-start service journeys
    const startedJourneys = await autoStartServiceJourneys(db, schema, clientJourneyId, clientJourney, now)

    return { success: true, completed: true, startedJourneys }
  }
})

/**
 * When an engagement journey completes, automatically start service journeys
 * for all engaged services on the matter.
 */
async function autoStartServiceJourneys(
  db: ReturnType<typeof import('../../../db').useDrizzle>,
  schema: typeof import('../../../db').schema,
  clientJourneyId: string,
  clientJourney: { clientId: string; journeyId: string; matterId: string | null },
  now: Date
) {
  const { eq, and, ne } = await import('drizzle-orm')

  // Get the journey template to check if it's an ENGAGEMENT type
  const journeyTemplate = await db.select()
    .from(schema.journeys)
    .where(eq(schema.journeys.id, clientJourney.journeyId))
    .get()

  if (!journeyTemplate || journeyTemplate.journeyType !== 'ENGAGEMENT') {
    return [] // Not an engagement journey, nothing to auto-start
  }

  // Find the matter that has this as its engagement journey
  const matter = await db.select()
    .from(schema.matters)
    .where(eq(schema.matters.engagementJourneyId, clientJourneyId))
    .get()

  if (!matter) {
    return [] // No matter linked to this engagement journey
  }

  // Get all engaged services for this matter
  const engagedServices = await db.select()
    .from(schema.mattersToServices)
    .where(eq(schema.mattersToServices.matterId, matter.id))
    .all()

  if (engagedServices.length === 0) {
    return [] // No services engaged
  }

  const startedJourneys: Array<{ id: string; serviceName: string; journeyName: string }> = []

  for (const engagement of engagedServices) {
    // Find the SERVICE journey template for this catalog item
    const serviceJourney = await db.select()
      .from(schema.journeys)
      .where(and(
        eq(schema.journeys.serviceCatalogId, engagement.catalogId),
        eq(schema.journeys.journeyType, 'SERVICE'),
        eq(schema.journeys.isActive, true)
      ))
      .get()

    if (!serviceJourney) {
      continue // No service journey defined for this service
    }

    // Check if a journey already exists for this engagement
    const existingJourney = await db.select()
      .from(schema.clientJourneys)
      .where(and(
        eq(schema.clientJourneys.matterId, matter.id),
        eq(schema.clientJourneys.catalogId, engagement.catalogId),
        ne(schema.clientJourneys.status, 'CANCELLED')
      ))
      .get()

    if (existingJourney) {
      continue // Journey already exists for this service engagement
    }

    // Get the first step of the service journey
    const firstStep = await db.select({ id: schema.journeySteps.id })
      .from(schema.journeySteps)
      .where(eq(schema.journeySteps.journeyId, serviceJourney.id))
      .orderBy(schema.journeySteps.stepOrder)
      .limit(1)
      .get()

    // Create the new client journey
    const newClientJourneyId = nanoid()

    await db.insert(schema.clientJourneys).values({
      id: newClientJourneyId,
      clientId: clientJourney.clientId,
      matterId: matter.id,
      catalogId: engagement.catalogId,
      journeyId: serviceJourney.id,
      currentStepId: firstStep?.id || null,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })

    // Create progress record for the first step
    if (firstStep) {
      await db.insert(schema.journeyStepProgress).values({
        id: nanoid(),
        clientJourneyId: newClientJourneyId,
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

    // Get service name for the response
    const service = await db.select({ name: schema.serviceCatalog.name })
      .from(schema.serviceCatalog)
      .where(eq(schema.serviceCatalog.id, engagement.catalogId))
      .get()

    startedJourneys.push({
      id: newClientJourneyId,
      serviceName: service?.name || 'Unknown Service',
      journeyName: serviceJourney.name
    })
  }

  return startedJourneys
}



