// Get all journeys
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const type = query.type // 'ENGAGEMENT', 'SERVICE', 'all', or undefined

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, desc, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Validate type parameter
  if (type && type !== 'all' && !['ENGAGEMENT', 'SERVICE'].includes(type as string)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid type parameter. Must be ENGAGEMENT or SERVICE'
    })
  }

  // Build WHERE conditions
  const conditions = [eq(schema.journeys.isActive, true)]
  if (type && type !== 'all') {
    conditions.push(eq(schema.journeys.journeyType, type as string))
  }

  // Get all journeys
  const journeys = await db.select()
    .from(schema.journeys)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(schema.journeys.createdAt))
    .all()

  // Enrich with related data
  const enrichedJourneys = await Promise.all(
    journeys.map(async (journey) => {
      // Get linked catalog items via junction table
      const catalogLinks = await db.select({
        id: schema.serviceCatalog.id,
        name: schema.serviceCatalog.name,
        category: schema.serviceCatalog.category
      })
        .from(schema.journeysToCatalog)
        .innerJoin(schema.serviceCatalog, eq(schema.journeysToCatalog.catalogId, schema.serviceCatalog.id))
        .where(eq(schema.journeysToCatalog.journeyId, journey.id))
        .all()

      // Get step count
      const stepCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.journeySteps)
        .where(eq(schema.journeySteps.journeyId, journey.id))
        .get()

      // Get active clients count
      const activeClientsResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.clientJourneys)
        .where(and(
          eq(schema.clientJourneys.journeyId, journey.id),
          eq(schema.clientJourneys.status, 'IN_PROGRESS')
        ))
        .get()

      // Convert to snake_case for API compatibility
      return {
        id: journey.id,
        catalog_items: catalogLinks,
        name: journey.name,
        description: journey.description,
        journey_type: journey.journeyType,
        is_active: journey.isActive ? 1 : 0,
        estimated_duration_days: journey.estimatedDurationDays,
        created_at: journey.createdAt instanceof Date ? journey.createdAt.getTime() : journey.createdAt,
        updated_at: journey.updatedAt instanceof Date ? journey.updatedAt.getTime() : journey.updatedAt,
        step_count: stepCountResult?.count || 0,
        active_clients: activeClientsResult?.count || 0
      }
    })
  )

  return {
    journeys: enrichedJourneys
  }
})



