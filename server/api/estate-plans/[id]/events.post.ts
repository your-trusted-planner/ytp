/**
 * POST /api/estate-plans/:id/events
 *
 * Add a new event to an estate plan's timeline.
 */

import { useDrizzle, schema } from '../../../db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const eventSchema = z.object({
  eventType: z.string().min(1),
  eventDate: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  personId: z.string().optional(),
  distributionAmount: z.number().optional(),
  distributionDescription: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }

  const body = await readBody(event)
  const parsed = eventSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid event data',
      data: parsed.error.flatten()
    })
  }

  const db = useDrizzle()

  // Verify plan exists
  const [plan] = await db.select()
    .from(schema.estatePlans)
    .where(eq(schema.estatePlans.id, planId))

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Estate plan not found' })
  }

  // Create the event
  const eventId = crypto.randomUUID()
  const eventData = parsed.data

  await db.insert(schema.planEvents).values({
    id: eventId,
    planId,
    eventType: eventData.eventType as any,
    eventDate: new Date(eventData.eventDate),
    description: eventData.description || null,
    notes: eventData.notes || null,
    personId: eventData.personId || null,
    distributionAmount: eventData.distributionAmount || null,
    distributionDescription: eventData.distributionDescription || null,
    createdBy: user.id
  })

  // Return the created event
  const [createdEvent] = await db.select()
    .from(schema.planEvents)
    .where(eq(schema.planEvents.id, eventId))

  return {
    success: true,
    event: {
      id: createdEvent.id,
      eventType: createdEvent.eventType,
      eventDate: createdEvent.eventDate,
      description: createdEvent.description,
      notes: createdEvent.notes,
      createdAt: createdEvent.createdAt
    }
  }
})
