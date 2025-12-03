// Get all journeys
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only lawyers/admins can view all journeys
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const db = hubDatabase()
  
  // Get all journeys with their associated matter info
  const journeys = await db.prepare(`
    SELECT 
      j.*,
      m.name as matter_name,
      m.category as matter_category,
      (SELECT COUNT(*) FROM journey_steps WHERE journey_id = j.id) as step_count,
      (SELECT COUNT(*) FROM client_journeys WHERE journey_id = j.id AND status = 'IN_PROGRESS') as active_clients
    FROM journeys j
    LEFT JOIN matters m ON j.matter_id = m.id
    WHERE j.is_active = 1
    ORDER BY j.created_at DESC
  `).all()

  return {
    journeys: journeys.results || []
  }
})

