// Create a new journey
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  
  // Only lawyers/admins can create journeys
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()
  
  const journey = {
    id: nanoid(),
    matter_id: body.matterId || null,
    name: body.name,
    description: body.description || null,
    is_template: body.isTemplate ? 1 : 0,
    is_active: 1,
    estimated_duration_days: body.estimatedDurationDays || null,
    created_at: Date.now(),
    updated_at: Date.now()
  }

  await db.prepare(`
    INSERT INTO journeys (
      id, matter_id, name, description, is_template, is_active, 
      estimated_duration_days, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    journey.id,
    journey.matter_id,
    journey.name,
    journey.description,
    journey.is_template,
    journey.is_active,
    journey.estimated_duration_days,
    journey.created_at,
    journey.updated_at
  ).run()

  return { journey }
})



