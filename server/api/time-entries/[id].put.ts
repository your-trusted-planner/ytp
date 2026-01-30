// Update a time entry
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { resolveHourlyRate, calculateTimeEntryAmount } from '../../utils/billing-rates'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

const updateTimeEntrySchema = z.object({
  hours: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Hours must be a valid decimal number').optional(),
  description: z.string().min(1).optional(),
  workDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  isBillable: z.boolean().optional(),
  hourlyRate: z.number().int().min(0).optional() // Allow manual rate override
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Time entry ID is required'
    })
  }

  const body = await readBody(event)
  const parsed = updateTimeEntrySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Get existing entry
  const [existing] = await db
    .select()
    .from(schema.timeEntries)
    .where(eq(schema.timeEntries.id, id))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Time entry not found'
    })
  }

  // Only allow editing DRAFT entries (or SUBMITTED by admins)
  if (existing.status === 'BILLED') {
    throw createError({
      statusCode: 400,
      message: 'Cannot edit a billed time entry'
    })
  }

  if (existing.status === 'APPROVED' && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'Only admins can edit approved time entries'
    })
  }

  // Build update data
  const updates: Record<string, unknown> = {
    updatedAt: new Date()
  }

  const { hours, description, workDate, isBillable, hourlyRate } = parsed.data

  if (hours !== undefined) {
    updates.hours = hours
  }

  if (description !== undefined) {
    updates.description = description.trim()
  }

  if (workDate !== undefined) {
    updates.workDate = new Date(workDate)
  }

  if (isBillable !== undefined) {
    updates.isBillable = isBillable
  }

  // Handle rate and amount recalculation
  let newRate = existing.hourlyRate
  if (hourlyRate !== undefined) {
    // Manual rate override
    newRate = hourlyRate
    updates.hourlyRate = hourlyRate
  } else if (hours !== undefined || isBillable !== undefined) {
    // Recalculate with existing rate if hours or billable status changed
    newRate = existing.hourlyRate
  }

  // Recalculate amount if needed
  const finalHours = hours ?? existing.hours
  const finalIsBillable = isBillable ?? existing.isBillable
  const finalRate = newRate ?? 0

  if (finalIsBillable && finalRate) {
    updates.amount = calculateTimeEntryAmount(finalHours, finalRate)
  } else {
    updates.amount = 0
  }

  await db
    .update(schema.timeEntries)
    .set(updates)
    .where(eq(schema.timeEntries.id, id))

  // Log the activity
  const matterName = await resolveEntityName('matter', existing.matterId)

  await logActivity({
    type: 'TIME_ENTRY_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: existing.matterId, name: matterName } : undefined,
    event,
    details: {
      timeEntryId: id,
      changes: Object.keys(parsed.data)
    }
  })

  // Fetch updated entry
  const updatedEntries = await db
    .select({
      id: schema.timeEntries.id,
      userId: schema.timeEntries.userId,
      matterId: schema.timeEntries.matterId,
      hours: schema.timeEntries.hours,
      description: schema.timeEntries.description,
      workDate: schema.timeEntries.workDate,
      isBillable: schema.timeEntries.isBillable,
      hourlyRate: schema.timeEntries.hourlyRate,
      amount: schema.timeEntries.amount,
      status: schema.timeEntries.status,
      createdAt: schema.timeEntries.createdAt,
      updatedAt: schema.timeEntries.updatedAt,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      matterTitle: schema.matters.title
    })
    .from(schema.timeEntries)
    .leftJoin(schema.users, eq(schema.timeEntries.userId, schema.users.id))
    .leftJoin(schema.matters, eq(schema.timeEntries.matterId, schema.matters.id))
    .where(eq(schema.timeEntries.id, id))
    .limit(1)

  const updated = updatedEntries[0]
  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to retrieve updated time entry'
    })
  }

  return {
    timeEntry: {
      id: updated.id,
      userId: updated.userId,
      userName: [updated.userFirstName, updated.userLastName].filter(Boolean).join(' ') || 'Unknown',
      matterId: updated.matterId,
      matterTitle: updated.matterTitle || 'Unknown Matter',
      hours: updated.hours,
      description: updated.description,
      workDate: updated.workDate,
      isBillable: updated.isBillable,
      hourlyRate: updated.hourlyRate,
      amount: updated.amount,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }
  }
})
