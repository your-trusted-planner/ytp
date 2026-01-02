// Get all clients in a journey for kanban view
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const journeyId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can view kanban
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!journeyId) {
    throw createError({
      statusCode: 400,
      message: 'Journey ID is required'
    })
  }

  const query = getQuery(event)
  const db = hubDatabase()
  
  // Build status filter
  let statusFilter = ''
  if (query.status) {
    statusFilter = `AND cj.status = '${query.status}'`
  }

  // Get all client journeys for this journey
  const journeys = await db.prepare(`
    SELECT 
      cj.*,
      u.first_name as client_first_name,
      u.last_name as client_last_name,
      u.email as client_email,
      js.name as current_step_name,
      js.step_type as current_step_type,
      m.name as matter_name,
      m.price as total_price,
      jsp.started_at as step_started_at,
      jsp.status as step_progress_status
    FROM client_journeys cj
    JOIN users u ON cj.client_id = u.id
    LEFT JOIN journey_steps js ON cj.current_step_id = js.id
    LEFT JOIN journeys j ON cj.journey_id = j.id
    LEFT JOIN matters m ON j.matter_id = m.id
    LEFT JOIN journey_step_progress jsp ON cj.id = jsp.client_journey_id AND js.id = jsp.step_id
    WHERE cj.journey_id = ? ${statusFilter}
    ORDER BY cj.priority DESC, cj.created_at ASC
  `).bind(journeyId).all()

  return {
    journeys: journeys.results || []
  }
})



