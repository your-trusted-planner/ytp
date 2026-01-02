// Send a reminder to client about their current step
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientJourneyId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can send reminders
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const db = hubDatabase()

  // Get client journey details
  const clientJourney = await db.prepare(`
    SELECT 
      cj.*,
      u.email as client_email,
      u.first_name as client_first_name,
      js.name as current_step_name,
      j.name as journey_name
    FROM client_journeys cj
    JOIN users u ON cj.client_id = u.id
    LEFT JOIN journey_steps js ON cj.current_step_id = js.id
    JOIN journeys j ON cj.journey_id = j.id
    WHERE cj.id = ?
  `).bind(clientJourneyId).first()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // TODO: Implement email sending
  // For now, just log the reminder
  console.log('Sending reminder to:', clientJourney.client_email)
  console.log('About:', clientJourney.journey_name, '-', clientJourney.current_step_name)

  return { success: true }
})



