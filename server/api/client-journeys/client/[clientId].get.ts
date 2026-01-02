// Get all journeys for a specific client
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'clientId')
  
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  // Clients can only view their own journeys
  if (user.role === 'CLIENT' && user.id !== clientId) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const db = hubDatabase()
  
  // Get all active journeys for this client
  const journeys = await db.prepare(`
    SELECT 
      cj.*,
      j.name as journey_name,
      j.description as journey_description,
      j.estimated_duration_days,
      js.name as current_step_name,
      js.step_type as current_step_type,
      js.step_order as current_step_order,
      (SELECT COUNT(*) FROM journey_steps WHERE journey_id = j.id) as total_steps,
      m.name as matter_name
    FROM client_journeys cj
    JOIN journeys j ON cj.journey_id = j.id
    LEFT JOIN journey_steps js ON cj.current_step_id = js.id
    LEFT JOIN matters m ON j.matter_id = m.id
    WHERE cj.client_id = ?
    AND cj.status != 'CANCELLED'
    ORDER BY cj.priority DESC, cj.created_at DESC
  `).bind(clientId).all()

  return {
    journeys: journeys.results || []
  }
})



