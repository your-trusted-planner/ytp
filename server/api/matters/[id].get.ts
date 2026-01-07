// Get a single matter by ID
export default defineEventHandler(async (event) => {
  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const db = hubDatabase()

  // Get the matter with lead attorney and engagement journey info
  const matter = await db.prepare(`
    SELECT
      m.*,
      u.first_name as client_first_name,
      u.last_name as client_last_name,
      u.email as client_email,
      la.first_name as lead_attorney_first_name,
      la.last_name as lead_attorney_last_name,
      la.email as lead_attorney_email,
      j.name as engagement_journey_name
    FROM matters m
    LEFT JOIN users u ON m.client_id = u.id
    LEFT JOIN users la ON m.lead_attorney_id = la.id
    LEFT JOIN client_journeys cj ON m.engagement_journey_id = cj.id
    LEFT JOIN journeys j ON cj.journey_id = j.id
    WHERE m.id = ?
  `).bind(matterId).first()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Authorization: lawyers/admins can view any matter, clients can only view their own
  requireClientAccess(event, matter.client_id)

  return {
    matter
  }
})
