// Start a client on a journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only lawyers/admins can assign clients to journeys
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()
  
  // Get the first step of the journey
  const firstStep = await db.prepare(`
    SELECT id FROM journey_steps
    WHERE journey_id = ?
    ORDER BY step_order ASC
    LIMIT 1
  `).bind(body.journeyId).first()

  const clientJourney = {
    id: nanoid(),
    client_id: body.clientId,
    journey_id: body.journeyId,
    current_step_id: firstStep?.id || null,
    status: 'IN_PROGRESS',
    priority: body.priority || 'MEDIUM',
    started_at: Date.now(),
    completed_at: null,
    paused_at: null,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO client_journeys (
      id, client_id, journey_id, current_step_id, status, priority,
      started_at, completed_at, paused_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    clientJourney.id,
    clientJourney.client_id,
    clientJourney.journey_id,
    clientJourney.current_step_id,
    clientJourney.status,
    clientJourney.priority,
    clientJourney.started_at,
    clientJourney.completed_at,
    clientJourney.paused_at,
    clientJourney.created_at,
    clientJourney.updated_at
  ).run()

  // Create progress record for the first step
  if (firstStep) {
    const progressId = nanoid()
    await db.prepare(`
      INSERT INTO journey_step_progress (
        id, client_journey_id, step_id, status, client_approved, council_approved,
        iteration_count, started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      progressId,
      clientJourney.id,
      firstStep.id,
      'IN_PROGRESS',
      0,
      0,
      0,
      Date.now(),
      Date.now(),
      Date.now()
    ).run()
  }

  return { clientJourney }
})

