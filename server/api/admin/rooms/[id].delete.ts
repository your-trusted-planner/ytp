import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const user = event.context.user
  const db = useDrizzle()

  const existing = await db
    .select({ id: schema.rooms.id, name: schema.rooms.name })
    .from(schema.rooms)
    .where(eq(schema.rooms.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  // Soft delete — set isActive = false
  await db.update(schema.rooms)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.rooms.id, id))

  await logActivity({
    type: 'ROOM_DELETED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'room', id, name: existing.name },
    event
  })

  return { success: true }
})
