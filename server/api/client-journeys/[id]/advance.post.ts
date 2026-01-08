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
  const { eq, and, gt } = await import('drizzle-orm')
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

    return { success: true, completed: true }
  }
})



