import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { logActivity } from '../../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing channel ID' })

  const db = useDrizzle()

  const existing = await db.select()
    .from(schema.marketingChannels)
    .where(eq(schema.marketingChannels.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  // Soft delete: set isActive = 0
  await db.update(schema.marketingChannels)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(schema.marketingChannels.id, id))

  const user = event.context.user
  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    description: `Deactivated marketing channel "${existing.name}"`,
    event,
    details: { channelId: id }
  })

  return { success: true }
})
