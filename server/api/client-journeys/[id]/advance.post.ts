// Advance a client to the next step in their journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientJourneyId = getRouterParam(event, 'id')
  
  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get current journey and step
  const clientJourney = await db.prepare(`
    SELECT * FROM client_journeys WHERE id = ?
  `).bind(clientJourneyId).first()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Get current step
  const currentStep = await db.prepare(`
    SELECT * FROM journey_steps WHERE id = ?
  `).bind(clientJourney.current_step_id).first()

  if (!currentStep) {
    throw createError({
      statusCode: 400,
      message: 'Current step not found'
    })
  }

  // Mark current step as complete
  await db.prepare(`
    UPDATE journey_step_progress
    SET status = 'COMPLETE', completed_at = ?, updated_at = ?
    WHERE client_journey_id = ? AND step_id = ?
  `).bind(Date.now(), Date.now(), clientJourneyId, currentStep.id).run()

  // Get next step
  const nextStep = await db.prepare(`
    SELECT * FROM journey_steps
    WHERE journey_id = ? AND step_order > ?
    ORDER BY step_order ASC
    LIMIT 1
  `).bind(clientJourney.journey_id, currentStep.step_order).first()

  if (nextStep) {
    // Update client journey to next step
    await db.prepare(`
      UPDATE client_journeys
      SET current_step_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(nextStep.id, Date.now(), clientJourneyId).run()

    // Create progress record for next step
    const progressId = nanoid()
    await db.prepare(`
      INSERT INTO journey_step_progress (
        id, client_journey_id, step_id, status, client_approved, council_approved,
        iteration_count, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      progressId,
      clientJourneyId,
      nextStep.id,
      'IN_PROGRESS',
      0,
      0,
      0,
      Date.now(),
      Date.now(),
      Date.now()
    ).run()

    return { success: true, nextStep }
  } else {
    // Journey is complete
    await db.prepare(`
      UPDATE client_journeys
      SET status = 'COMPLETED', completed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), Date.now(), clientJourneyId).run()

    return { success: true, completed: true }
  }
})

