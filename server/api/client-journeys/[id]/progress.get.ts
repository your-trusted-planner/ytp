// Get detailed progress for a client journey
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientJourneyId = getRouterParam(event, 'id')
  
  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get client journey
  const clientJourney = await db.prepare(`
    SELECT cj.*, j.name as journey_name, j.description as journey_description
    FROM client_journeys cj
    JOIN journeys j ON cj.journey_id = j.id
    WHERE cj.id = ?
  `).bind(clientJourneyId).first()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Check authorization
  if (user.role === 'CLIENT' && user.id !== clientJourney.client_id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Get all steps and their progress
  const stepsWithProgress = await db.prepare(`
    SELECT
      js.*,
      jsp.status as progress_status,
      jsp.client_approved,
      jsp.counsel_approved,
      jsp.iteration_count,
      jsp.started_at as progress_started_at,
      jsp.completed_at as progress_completed_at
    FROM journey_steps js
    LEFT JOIN journey_step_progress jsp ON js.id = jsp.step_id AND jsp.client_journey_id = ?
    WHERE js.journey_id = ?
    ORDER BY js.step_order ASC
  `).bind(clientJourneyId, clientJourney.journey_id).all()

  return {
    clientJourney,
    steps: stepsWithProgress.results || []
  }
})



