// Get detailed progress for a client journey
export default defineEventHandler(async (event) => {
  const clientJourneyId = getRouterParam(event, 'id')

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and } = await import('drizzle-orm')
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

  // Check authorization - clients can only view their own journeys
  requireClientAccess(event, clientJourney.clientId)

  // Get journey info
  const journey = await db.select({
    name: schema.journeys.name,
    description: schema.journeys.description
  })
    .from(schema.journeys)
    .where(eq(schema.journeys.id, clientJourney.journeyId))
    .get()

  // Get all steps for this journey
  const steps = await db.select()
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.journeyId, clientJourney.journeyId))
    .orderBy(schema.journeySteps.stepOrder)
    .all()

  // Get all progress records for this client journey
  const progressRecords = await db.select()
    .from(schema.journeyStepProgress)
    .where(eq(schema.journeyStepProgress.clientJourneyId, clientJourneyId))
    .all()

  // Create progress map for quick lookup
  const progressMap = new Map(progressRecords.map(p => [p.stepId, p]))

  // Enrich steps with progress data and convert to snake_case
  const stepsWithProgress = steps.map(step => {
    const progress = progressMap.get(step.id)
    return {
      id: step.id,
      journey_id: step.journeyId,
      step_type: step.stepType,
      name: step.name,
      description: step.description,
      step_order: step.stepOrder,
      responsible_party: step.responsibleParty,
      expected_duration_days: step.expectedDurationDays,
      automation_config: step.automationConfig,
      help_content: step.helpContent,
      allow_multiple_iterations: step.allowMultipleIterations ? 1 : 0,
      is_final_step: step.isFinalStep ? 1 : 0,
      requires_verification: step.requiresVerification ? 1 : 0,
      created_at: step.createdAt instanceof Date ? step.createdAt.getTime() : step.createdAt,
      updated_at: step.updatedAt instanceof Date ? step.updatedAt.getTime() : step.updatedAt,
      progress_status: progress?.status || null,
      client_approved: progress?.clientApproved ? 1 : 0,
      attorney_approved: progress?.attorneyApproved ? 1 : 0,
      iteration_count: progress?.iterationCount || 0,
      progress_started_at: progress?.startedAt instanceof Date ? progress.startedAt.getTime() : progress?.startedAt,
      progress_completed_at: progress?.completedAt instanceof Date ? progress.completedAt.getTime() : progress?.completedAt
    }
  })

  return {
    clientJourney: {
      id: clientJourney.id,
      client_id: clientJourney.clientId,
      matter_id: clientJourney.matterId,
      catalog_id: clientJourney.catalogId,
      journey_id: clientJourney.journeyId,
      current_step_id: clientJourney.currentStepId,
      status: clientJourney.status,
      priority: clientJourney.priority,
      started_at: clientJourney.startedAt instanceof Date ? clientJourney.startedAt.getTime() : clientJourney.startedAt,
      completed_at: clientJourney.completedAt instanceof Date ? clientJourney.completedAt.getTime() : clientJourney.completedAt,
      paused_at: clientJourney.pausedAt instanceof Date ? clientJourney.pausedAt.getTime() : clientJourney.pausedAt,
      created_at: clientJourney.createdAt instanceof Date ? clientJourney.createdAt.getTime() : clientJourney.createdAt,
      updated_at: clientJourney.updatedAt instanceof Date ? clientJourney.updatedAt.getTime() : clientJourney.updatedAt,
      journey_name: journey?.name || null,
      journey_description: journey?.description || null
    },
    steps: stepsWithProgress
  }
})



