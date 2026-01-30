// Submit a time entry for approval
import { eq } from 'drizzle-orm'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Time entry ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
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

  // Only allow submitting DRAFT entries
  if (existing.status !== 'DRAFT') {
    throw createError({
      statusCode: 400,
      message: `Cannot submit a time entry with status '${existing.status}'. Only DRAFT entries can be submitted.`
    })
  }

  // Only the creator can submit their own entries
  if (existing.userId !== user.id && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'You can only submit your own time entries'
    })
  }

  // Update status to SUBMITTED
  await db
    .update(schema.timeEntries)
    .set({
      status: 'SUBMITTED',
      updatedAt: new Date()
    })
    .where(eq(schema.timeEntries.id, id))

  // Log the activity
  const matterName = await resolveEntityName('matter', existing.matterId)

  await logActivity({
    type: 'TIME_ENTRY_SUBMITTED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: existing.matterId, name: matterName } : undefined,
    event,
    details: {
      timeEntryId: id,
      hours: existing.hours,
      amount: existing.amount
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
