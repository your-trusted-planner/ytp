// Get all clients in a journey for kanban view
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const journeyId = getRouterParam(event, 'id')

  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const query = getQuery(event)
  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, desc, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Build WHERE conditions
  const conditions = [eq(schema.clientJourneys.journeyId, journeyId)]
  if (query.status) {
    conditions.push(eq(schema.clientJourneys.status, query.status as string))
  }

  // Get all client journeys for this journey
  const clientJourneys = await db.select()
    .from(schema.clientJourneys)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(schema.clientJourneys.priority), schema.clientJourneys.createdAt)
    .all()

  // Get unique IDs for batch fetching
  const clientIds = [...new Set(clientJourneys.map(cj => cj.clientId))]
  const stepIds = [...new Set(clientJourneys.map(cj => cj.currentStepId).filter(Boolean) as string[])]
  const matterIds = [...new Set(clientJourneys.map(cj => cj.matterId).filter(Boolean) as string[])]

  // Fetch all related data in parallel
  const [clients, steps, matters, progressRecords] = await Promise.all([
    // Get all clients
    clientIds.length > 0
      ? db.select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email
        })
        .from(schema.users)
        .where(inArray(schema.users.id, clientIds))
        .all()
      : [],

    // Get all current steps
    stepIds.length > 0
      ? db.select({
          id: schema.journeySteps.id,
          name: schema.journeySteps.name,
          stepType: schema.journeySteps.stepType
        })
        .from(schema.journeySteps)
        .where(inArray(schema.journeySteps.id, stepIds))
        .all()
      : [],

    // Get all matters
    matterIds.length > 0
      ? db.select({
          id: schema.matters.id,
          name: schema.matters.name,
          price: schema.matters.price
        })
        .from(schema.matters)
        .where(inArray(schema.matters.id, matterIds))
        .all()
      : [],

    // Get all progress records
    db.select()
      .from(schema.journeyStepProgress)
      .where(inArray(
        schema.journeyStepProgress.clientJourneyId,
        clientJourneys.map(cj => cj.id)
      ))
      .all()
  ])

  // Create lookup maps
  const clientMap = new Map(clients.map(c => [c.id, c]))
  const stepMap = new Map(steps.map(s => [s.id, s]))
  const matterMap = new Map(matters.map(m => [m.id, m]))
  const progressMap = new Map(
    progressRecords.map(p => [`${p.clientJourneyId}-${p.stepId}`, p])
  )

  // Enrich client journeys with related data
  const enrichedJourneys = clientJourneys.map(cj => {
    const client = clientMap.get(cj.clientId)
    const step = cj.currentStepId ? stepMap.get(cj.currentStepId) : null
    const matter = cj.matterId ? matterMap.get(cj.matterId) : null
    const progress = cj.currentStepId
      ? progressMap.get(`${cj.id}-${cj.currentStepId}`)
      : null

    return {
      ...cj,
      client_first_name: client?.firstName || null,
      client_last_name: client?.lastName || null,
      client_email: client?.email || null,
      current_step_name: step?.name || null,
      current_step_type: step?.stepType || null,
      matter_name: matter?.name || null,
      total_price: matter?.price || null,
      step_started_at: progress?.startedAt || null,
      step_progress_status: progress?.status || null
    }
  })

  return {
    journeys: enrichedJourneys
  }
})



