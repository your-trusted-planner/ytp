import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { generateId } from '../../../../utils/auth'
import { logActivity } from '../../../../utils/activity-logger'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channelType: z.enum(['EMAIL', 'SMS']),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  sortOrder: z.number().int().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = createSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const { name, description, channelType, slug, sortOrder } = result.data
  const db = useDrizzle()

  // Check slug uniqueness
  const existing = await db.select({ id: schema.marketingChannels.id })
    .from(schema.marketingChannels)
    .where(eq(schema.marketingChannels.slug, slug))
    .get()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `Channel with slug "${slug}" already exists`
    })
  }

  const id = generateId()
  const now = new Date()

  await db.insert(schema.marketingChannels).values({
    id,
    name,
    description: description ?? null,
    channelType,
    slug,
    sortOrder: sortOrder ?? 0,
    isActive: 1,
    createdAt: now,
    updatedAt: now
  })

  const user = event.context.user
  await logActivity({
    type: 'SETTINGS_CHANGED',
    userId: user.id,
    userRole: user.role,
    description: `Created marketing channel "${name}"`,
    event,
    details: { channelId: id, channelType, slug }
  })

  return {
    success: true,
    channel: { id, name, description: description ?? null, channelType, slug, isActive: 1, sortOrder: sortOrder ?? 0 }
  }
})
