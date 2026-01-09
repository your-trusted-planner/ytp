// Get all client journeys for a specific matter
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'matterId')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all journeys for this matter
  const clientJourneys = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.matterId, matterId))
    .orderBy(desc(schema.clientJourneys.createdAt))
    .all()

  // Enrich with related data
  const enrichedJourneys = await Promise.all(
    clientJourneys.map(async (cj) => {
      // Get journey info
      const journey = cj.journeyId
        ? await db.select({
            name: schema.journeys.name,
            description: schema.journeys.description,
            estimatedDurationDays: schema.journeys.estimatedDurationDays
          })
          .from(schema.journeys)
          .where(eq(schema.journeys.id, cj.journeyId))
          .get()
        : null

      // Get current step info
      const currentStep = cj.currentStepId
        ? await db.select({
            name: schema.journeySteps.name,
            stepType: schema.journeySteps.stepType
          })
          .from(schema.journeySteps)
          .where(eq(schema.journeySteps.id, cj.currentStepId))
          .get()
        : null

      // Get service catalog info
      const service = cj.catalogId
        ? await db.select({
            name: schema.serviceCatalog.name,
            category: schema.serviceCatalog.category
          })
          .from(schema.serviceCatalog)
          .where(eq(schema.serviceCatalog.id, cj.catalogId))
          .get()
        : null

      // Get client info
      const client = await db.select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email
      })
        .from(schema.users)
        .where(eq(schema.users.id, cj.clientId))
        .get()

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
        service_name: service?.name || null,
        service_category: service?.category || null,
        first_name: client?.firstName || null,
        last_name: client?.lastName || null,
        email: client?.email || null
      }
    })
  )

  return {
    journeys: enrichedJourneys
  }
})
