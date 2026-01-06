// Get all document uploads for a client journey
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

  // Check authorization - clients can only view their own journey's uploads
  requireClientAccess(event, clientJourney.client_id)

  // Get all uploads
  const uploads = await db.prepare(`
    SELECT 
      du.*,
      u1.first_name as uploaded_by_first_name,
      u1.last_name as uploaded_by_last_name,
      u2.first_name as reviewed_by_first_name,
      u2.last_name as reviewed_by_last_name
    FROM document_uploads du
    LEFT JOIN users u1 ON du.uploaded_by_user_id = u1.id
    LEFT JOIN users u2 ON du.reviewed_by_user_id = u2.id
    WHERE du.client_journey_id = ?
    ORDER BY du.created_at DESC
  `).bind(clientJourneyId).all()

  return {
    uploads: uploads.results || []
  }
})



