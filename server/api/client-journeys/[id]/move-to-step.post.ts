// Move a client to a different step in their journey
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

  const body = await readBody(event)
  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get current step
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

  const now = new Date()

  // Mark current step as complete
  if (clientJourney.currentStepId) {
    await db.update(schema.journeyStepProgress)
      .set({
        status: 'COMPLETE',
        completedAt: now,
        updatedAt: now
      })
      .where(and(
        eq(schema.journeyStepProgress.clientJourneyId, clientJourneyId),
        eq(schema.journeyStepProgress.stepId, clientJourney.currentStepId)
      ))
  }

  // Update to new step
  await db.update(schema.clientJourneys)
    .set({
      currentStepId: body.stepId,
      updatedAt: now
    })
    .where(eq(schema.clientJourneys.id, clientJourneyId))

  // Create or update progress for new step
  const existingProgress = await db.select()
    .from(schema.journeyStepProgress)
    .where(and(
      eq(schema.journeyStepProgress.clientJourneyId, clientJourneyId),
      eq(schema.journeyStepProgress.stepId, body.stepId)
    ))
    .get()

  if (existingProgress) {
    // Reactivate existing progress
    await db.update(schema.journeyStepProgress)
      .set({
        status: 'IN_PROGRESS',
        startedAt: now,
        updatedAt: now
      })
      .where(eq(schema.journeyStepProgress.id, existingProgress.id))
  } else {
    // Create new progress record
    await db.insert(schema.journeyStepProgress).values({
      id: nanoid(),
      clientJourneyId: clientJourneyId,
      stepId: body.stepId,
      status: 'IN_PROGRESS',
      clientApproved: false,
      attorneyApproved: false,
      iterationCount: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    })
  }

  return { success: true }
})



