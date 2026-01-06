// Get all client journeys for a specific matter
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'matterId')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const db = hubDatabase()

  // Get all journeys for this matter
  const journeys = await db.prepare(`
    SELECT
      cj.*,
      j.name as journey_name,
      j.description as journey_description,
      j.estimated_duration_days,
      js.name as current_step_name,
      js.step_type as current_step_type,
      sc.name as service_name,
      sc.category as service_category,
      u.first_name,
      u.last_name,
      u.email
    FROM client_journeys cj
    LEFT JOIN journeys j ON cj.journey_id = j.id
    LEFT JOIN journey_steps js ON cj.current_step_id = js.id
    LEFT JOIN service_catalog sc ON cj.catalog_id = sc.id
    LEFT JOIN users u ON cj.client_id = u.id
    WHERE cj.matter_id = ?
    ORDER BY cj.created_at DESC
  `).bind(matterId).all()

  return {
    journeys: journeys.results || []
  }
})
