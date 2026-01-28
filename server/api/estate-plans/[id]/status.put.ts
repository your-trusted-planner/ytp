/**
 * PUT /api/estate-plans/:id/status
 *
 * Update estate plan status with state machine validation.
 * Automatically handles side effects like timestamp updates and event creation.
 */

import { useDrizzle, schema } from '../../../db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'

// Valid status values
const statusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'AMENDED',
  'INCAPACITATED',
  'ADMINISTERED',
  'DISTRIBUTED',
  'CLOSED'
])

// State machine: valid transitions from each status
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['ACTIVE'],
  'ACTIVE': ['AMENDED', 'INCAPACITATED', 'ADMINISTERED', 'CLOSED'],
  'AMENDED': ['ACTIVE', 'INCAPACITATED', 'ADMINISTERED', 'CLOSED'],
  'INCAPACITATED': ['ACTIVE', 'ADMINISTERED'],
  'ADMINISTERED': ['DISTRIBUTED', 'CLOSED'],
  'DISTRIBUTED': ['CLOSED'],
  'CLOSED': []  // Terminal state
}

// Event types to auto-create for each status transition
const statusEventTypes: Record<string, string> = {
  'ACTIVE': 'PLAN_SIGNED',
  'AMENDED': 'PLAN_AMENDED',
  'INCAPACITATED': 'GRANTOR_INCAPACITATED',
  'ADMINISTERED': 'ADMINISTRATION_STARTED',
  'DISTRIBUTED': 'FINAL_DISTRIBUTION',
  'CLOSED': 'PLAN_CLOSED'
}

const statusUpdateSchema = z.object({
  status: statusEnum,
  notes: z.string().optional(),
  // Allow backdating for historical data entry
  effectiveDate: z.string().optional()
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
  const parsed = statusUpdateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid status data',
      data: parsed.error.flatten()
    })
  }

  const { status: newStatus, notes, effectiveDate: effectiveDateStr } = parsed.data
  const db = useDrizzle()

  // Get current plan
  const [plan] = await db.select()
    .from(schema.estatePlans)
    .where(eq(schema.estatePlans.id, planId))

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Estate plan not found' })
  }

  const currentStatus = plan.status
  const allowedTransitions = validTransitions[currentStatus] || []

  // Validate transition
  if (!allowedTransitions.includes(newStatus)) {
    throw createError({
      statusCode: 400,
      message: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
      data: {
        currentStatus,
        requestedStatus: newStatus,
        allowedTransitions
      }
    })
  }

  // Prepare update fields
  const now = new Date()
  const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : now
  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: now
  }

  // Status-specific side effects
  switch (newStatus) {
    case 'ACTIVE':
      updateData.effectiveDate = effectiveDate
      break
    case 'AMENDED':
      updateData.lastAmendedAt = effectiveDate
      break
    case 'ADMINISTERED':
      updateData.administrationStartedAt = effectiveDate
      break
    case 'CLOSED':
      updateData.closedAt = effectiveDate
      break
  }

  // Update the plan
  await db.update(schema.estatePlans)
    .set(updateData)
    .where(eq(schema.estatePlans.id, planId))

  // Auto-create event for this status change
  const eventType = statusEventTypes[newStatus]
  if (eventType) {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    await db.insert(schema.planEvents).values({
      id: eventId,
      planId,
      eventType: eventType as any,
      eventDate: effectiveDate,
      description: notes || `Status changed from ${currentStatus} to ${newStatus}`,
      notes: notes || null,
      createdBy: user.id
    })
  }

  // Log activity
  const planName = await resolveEntityName('estate_plan', planId)
  await logActivity({
    type: 'ESTATE_PLAN_STATUS_CHANGED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'estate_plan', id: planId, name: planName || 'Estate Plan' },
    event,
    details: {
      oldStatus: currentStatus,
      newStatus,
      effectiveDate: effectiveDate.toISOString()
    }
  })

  // Return updated plan status
  return {
    success: true,
    plan: {
      id: planId,
      status: newStatus,
      previousStatus: currentStatus,
      effectiveDate: updateData.effectiveDate?.toISOString(),
      lastAmendedAt: updateData.lastAmendedAt?.toISOString(),
      administrationStartedAt: updateData.administrationStartedAt?.toISOString(),
      closedAt: updateData.closedAt?.toISOString(),
      updatedAt: now.toISOString()
    }
  }
})
