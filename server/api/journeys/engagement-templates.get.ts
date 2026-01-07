// Get all ENGAGEMENT-type journey templates for use in matter form dropdown
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const db = hubDatabase()

  const journeys = await db.prepare(`
    SELECT
      j.id,
      j.name,
      j.description,
      j.estimated_duration_days,
      (SELECT COUNT(*) FROM journey_steps WHERE journey_id = j.id) as step_count
    FROM journeys j
    WHERE j.is_active = 1 AND j.journey_type = 'ENGAGEMENT'
    ORDER BY j.name ASC
  `).all()

  return {
    engagementJourneys: journeys.results || []
  }
})
