// Delete a time entry (DRAFT only)
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activity-logger'
import { resolveEntityName } from '../../utils/entity-resolver'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Time entry ID is required'
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

  // Only allow deleting DRAFT entries
  if (existing.status !== 'DRAFT') {
    throw createError({
      statusCode: 400,
      message: `Cannot delete a time entry with status '${existing.status}'. Only DRAFT entries can be deleted.`
    })
  }

  // Only the creator or admin can delete
  if (existing.userId !== user.id && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete your own time entries'
    })
  }

  // Delete the entry
  await db
    .delete(schema.timeEntries)
    .where(eq(schema.timeEntries.id, id))

  // Log the activity
  const matterName = await resolveEntityName('matter', existing.matterId)

  await logActivity({
    type: 'TIME_ENTRY_DELETED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: existing.matterId, name: matterName } : undefined,
    event,
    details: {
      timeEntryId: id,
      hours: existing.hours,
      description: existing.description
    }
  })

  return { success: true }
})
