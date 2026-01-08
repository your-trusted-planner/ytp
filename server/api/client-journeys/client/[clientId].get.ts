// Get all journeys for a specific client
export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  // Clients can only view their own journeys
  requireClientAccess(event, clientId)

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, ne, desc, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all active journeys for this client
  const clientJourneys = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.clientId, clientId))
    .orderBy(desc(schema.clientJourneys.priority), desc(schema.clientJourneys.createdAt))
    .all()

  // Filter out cancelled journeys
  const activeJourneys = clientJourneys.filter(cj => cj.status !== 'CANCELLED')

  // Enrich with related data
  const enrichedJourneys = await Promise.all(
    activeJourneys.map(async (cj) => {
      // Get journey info
      const journey = await db.select({
        name: schema.journeys.name,
        description: schema.journeys.description,
        estimatedDurationDays: schema.journeys.estimatedDurationDays,
        serviceCatalogId: schema.journeys.serviceCatalogId
      })
        .from(schema.journeys)
        .where(eq(schema.journeys.id, cj.journeyId))
        .get()

      // Get current step info
      const currentStep = cj.currentStepId
        ? await db.select({
            name: schema.journeySteps.name,
            stepType: schema.journeySteps.stepType,
            stepOrder: schema.journeySteps.stepOrder
          })
          .from(schema.journeySteps)
          .where(eq(schema.journeySteps.id, cj.currentStepId))
          .get()
        : null

      // Get total steps count
      const totalStepsResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.journeySteps)
        .where(eq(schema.journeySteps.journeyId, cj.journeyId))
        .get()

      // Get service catalog info if journey has one
      const service = journey?.serviceCatalogId
        ? await db.select({ name: schema.serviceCatalog.name })
          .from(schema.serviceCatalog)
          .where(eq(schema.serviceCatalog.id, journey.serviceCatalogId))
          .get()
        : null

      // Get matter info
      const matter = cj.matterId
        ? await db.select({
            title: schema.matters.title,
            matterNumber: schema.matters.matterNumber
          })
          .from(schema.matters)
          .where(eq(schema.matters.id, cj.matterId))
          .get()
        : null

      // Convert to snake_case for API compatibility
      return {
        id: cj.id,
        client_id: cj.clientId,
        matter_id: cj.matterId,
        catalog_id: cj.catalogId,
        journey_id: cj.journeyId,
        current_step_id: cj.currentStepId,
        status: cj.status,
        priority: cj.priority,
        started_at: cj.startedAt instanceof Date ? cj.startedAt.getTime() : cj.startedAt,
        completed_at: cj.completedAt instanceof Date ? cj.completedAt.getTime() : cj.completedAt,
        paused_at: cj.pausedAt instanceof Date ? cj.pausedAt.getTime() : cj.pausedAt,
        created_at: cj.createdAt instanceof Date ? cj.createdAt.getTime() : cj.createdAt,
        updated_at: cj.updatedAt instanceof Date ? cj.updatedAt.getTime() : cj.updatedAt,
        journey_name: journey?.name || null,
        journey_description: journey?.description || null,
        estimated_duration_days: journey?.estimatedDurationDays || null,
        current_step_name: currentStep?.name || null,
        current_step_type: currentStep?.stepType || null,
        current_step_order: currentStep?.stepOrder || null,
        total_steps: totalStepsResult?.count || 0,
        service_name: service?.name || null,
        matter_title: matter?.title || null,
        matter_number: matter?.matterNumber || null
      }
    })
  )

  return {
    journeys: enrichedJourneys
  }
})



