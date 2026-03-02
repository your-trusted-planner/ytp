import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { logActivity } from '../../../../utils/activity-logger'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  channelType: z.enum(['EMAIL', 'SMS']).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
  sortOrder: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing channel ID' })

  const body = await readBody(event)
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const db = useDrizzle()

  const existing = await db.select()
    .from(schema.marketingChannels)
    .where(eq(schema.marketingChannels.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const data = result.data

  // Check slug uniqueness if changing
  if (data.slug && data.slug !== existing.slug) {
    const slugConflict = await db.select({ id: schema.marketingChannels.id })
      .from(schema.marketingChannels)
      .where(and(
        eq(schema.marketingChannels.slug, data.slug),
        ne(schema.marketingChannels.id, id)
      ))
      .get()

    if (slugConflict) {
      throw createError({
        statusCode: 409,
        message: `Channel with slug "${data.slug}" already exists`
      })
    }
  }

  const updateData: Record<string, any> = { updatedAt: new Date() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.channelType !== undefined) updateData.channelType = data.channelType
  if (data.slug !== undefined) updateData.slug = data.slug
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  await db.update(schema.marketingChannels)
    .set(updateData)
    .where(eq(schema.marketingChannels.id, id))

  const user = event.context.user
  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    description: `Updated marketing channel "${data.name || existing.name}"`,
    event,
    details: { channelId: id, changes: Object.keys(data) }
  })

  return { success: true }
})
