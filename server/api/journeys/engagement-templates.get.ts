// Get all ENGAGEMENT-type journey templates for use in matter form dropdown
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  const journeys = await db.select()
    .from(schema.journeys)
    .where(and(
      eq(schema.journeys.isActive, true),
      eq(schema.journeys.journeyType, 'ENGAGEMENT')
    ))
    .orderBy(schema.journeys.name)
    .all()

  // Enrich with step counts
  const enrichedJourneys = await Promise.all(
    journeys.map(async (journey) => {
      const stepCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.journeySteps)
        .where(eq(schema.journeySteps.journeyId, journey.id))
        .get()

      return {
        id: journey.id,
        name: journey.name,
        description: journey.description,
        estimated_duration_days: journey.estimatedDurationDays,
        step_count: stepCountResult?.count || 0
      }
    })
  )

  return {
    engagementJourneys: enrichedJourneys
  }
})
