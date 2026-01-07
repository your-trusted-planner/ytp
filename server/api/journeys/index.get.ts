// Get all journeys
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const type = query.type // 'ENGAGEMENT', 'SERVICE', 'all', or undefined

  const db = hubDatabase()

  // Build WHERE clause based on type filter
  let whereClause = 'WHERE j.is_active = 1'
  if (type && type !== 'all') {
    // Validate type parameter
    if (!['ENGAGEMENT', 'SERVICE'].includes(type as string)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid type parameter. Must be ENGAGEMENT or SERVICE'
      })
    }
    whereClause += ` AND j.journey_type = '${type}'`
  }

  // Get journeys with their associated service catalog info
  const journeys = await db.prepare(`
    SELECT
      j.*,
      sc.name as service_name,
      sc.category as service_category,
      (SELECT COUNT(*) FROM journey_steps WHERE journey_id = j.id) as step_count,
      (SELECT COUNT(*) FROM client_journeys WHERE journey_id = j.id AND status = 'IN_PROGRESS') as active_clients
    FROM journeys j
    LEFT JOIN service_catalog sc ON j.service_catalog_id = sc.id
    ${whereClause}
    ORDER BY j.created_at DESC
  `).all()

  return {
    journeys: journeys.results || []
  }
})



