// Get all snapshot versions for a client journey
export default defineEventHandler(async (event) => {
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

  // Check authorization - clients can only view their own journey's snapshots
  requireClientAccess(event, clientJourney.client_id)

  // Get all snapshots
  const snapshots = await db.prepare(`
    SELECT * FROM snapshot_versions
    WHERE client_journey_id = ?
    ORDER BY version_number DESC
  `).bind(clientJourneyId).all()

  return {
    snapshots: snapshots.results || []
  }
})



