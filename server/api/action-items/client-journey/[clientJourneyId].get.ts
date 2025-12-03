// Get all action items for a client journey
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientJourneyId = getRouterParam(event, 'clientJourneyId')
  
  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get client journey to check authorization
  const clientJourney = await db.prepare(`
    SELECT * FROM client_journeys WHERE id = ?
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

  // Get all action items for this client journey
  const actionItems = await db.prepare(`
    SELECT 
      ai.*,
      u.first_name as completed_by_first_name,
      u.last_name as completed_by_last_name
    FROM action_items ai
    LEFT JOIN users u ON ai.completed_by = u.id
    WHERE ai.client_journey_id = ?
    ORDER BY ai.priority DESC, ai.due_date ASC, ai.created_at ASC
  `).bind(clientJourneyId).all()

  return {
    actionItems: actionItems.results || []
  }
})

