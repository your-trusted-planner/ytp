// Get a specific journey with all its steps
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const journeyId = getRouterParam(event, 'id')
  
  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get journey details
  const journey = await db.prepare(`
    SELECT 
      j.*,
      m.name as matter_name,
      m.category as matter_category
    FROM journeys j
    LEFT JOIN matters m ON j.matter_id = m.id
    WHERE j.id = ?
  `).bind(journeyId).first()

  if (!journey) {
    throw createError({
      statusCode: 404,
      message: 'Journey not found'
    })
  }

  // Get all steps for this journey
  const steps = await db.prepare(`
    SELECT * FROM journey_steps
    WHERE journey_id = ?
    ORDER BY step_order ASC
  `).bind(journeyId).all()

  return {
    journey,
    steps: steps.results || []
  }
})



