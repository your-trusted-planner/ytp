// Get a specific journey with all its steps
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const journeyId = getRouterParam(event, 'id')

  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get journey details
  const journey = await db.select()
    .from(schema.journeys)
    .where(eq(schema.journeys.id, journeyId))
    .get()

  if (!journey) {
    throw createError({
      statusCode: 404,
      message: 'Journey not found'
    })
  }

  // Get linked catalog items via junction table
  const catalogItems = await db.select({
    id: schema.serviceCatalog.id,
    name: schema.serviceCatalog.name,
    category: schema.serviceCatalog.category,
    price: schema.serviceCatalog.price
  })
    .from(schema.journeysToCatalog)
    .innerJoin(schema.serviceCatalog, eq(schema.journeysToCatalog.catalogId, schema.serviceCatalog.id))
    .where(eq(schema.journeysToCatalog.journeyId, journeyId))
    .all()

  // Get all steps for this journey
  const steps = await db.select()
    .from(schema.journeySteps)
    .where(eq(schema.journeySteps.journeyId, journeyId))
    .orderBy(schema.journeySteps.stepOrder)
    .all()

  // Convert to snake_case for API compatibility
  const stepsWithSnakeCase = steps.map(step => ({
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
    updated_at: step.updatedAt instanceof Date ? step.updatedAt.getTime() : step.updatedAt
  }))

  return {
    journey: {
      id: journey.id,
      catalog_items: catalogItems,
      name: journey.name,
      description: journey.description,
      journey_type: journey.journeyType,
      is_active: journey.isActive ? 1 : 0,
      estimated_duration_days: journey.estimatedDurationDays,
      created_at: journey.createdAt instanceof Date ? journey.createdAt.getTime() : journey.createdAt,
      updated_at: journey.updatedAt instanceof Date ? journey.updatedAt.getTime() : journey.updatedAt
    },
    steps: stepsWithSnakeCase
  }
})



