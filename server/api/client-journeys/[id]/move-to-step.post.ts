// Move a client to a different step in their journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientJourneyId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can move clients
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

  const body = await readBody(event)
  const db = hubDatabase()

  // Get current step
  const clientJourney = await db.prepare(`
    SELECT * FROM client_journeys WHERE id = ?
  `).bind(clientJourneyId).first()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Mark current step as complete
  if (clientJourney.current_step_id) {
    await db.prepare(`
      UPDATE journey_step_progress
      SET status = 'COMPLETE', completed_at = ?, updated_at = ?
      WHERE client_journey_id = ? AND step_id = ?
    `).bind(Date.now(), Date.now(), clientJourneyId, clientJourney.current_step_id).run()
  }

  // Update to new step
  await db.prepare(`
    UPDATE client_journeys
    SET current_step_id = ?, updated_at = ?
    WHERE id = ?
  `).bind(body.stepId, Date.now(), clientJourneyId).run()

  // Create or update progress for new step
  const existingProgress = await db.prepare(`
    SELECT * FROM journey_step_progress
    WHERE client_journey_id = ? AND step_id = ?
  `).bind(clientJourneyId, body.stepId).first()

  if (existingProgress) {
    // Reactivate existing progress
    await db.prepare(`
      UPDATE journey_step_progress
      SET status = 'IN_PROGRESS', started_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), Date.now(), existingProgress.id).run()
  } else {
    // Create new progress record
    const progressId = nanoid()
    await db.prepare(`
      INSERT INTO journey_step_progress (
        id, client_journey_id, step_id, status, client_approved, counsel_approved,
        iteration_count, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      progressId,
      clientJourneyId,
      body.stepId,
      'IN_PROGRESS',
      0,
      0,
      0,
      Date.now(),
      Date.now(),
      Date.now()
    ).run()
  }

  return { success: true }
})



