// Update a user's default hourly rate
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'

const updateUserRateSchema = z.object({
  defaultHourlyRate: z.number().int().min(0).nullable()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  const body = await readBody(event)
  const parsed = updateUserRateSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify user exists and get current rate
  const [existingUser] = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      defaultHourlyRate: schema.users.defaultHourlyRate
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Only LAWYER and STAFF roles should have billing rates
  if (!['LAWYER', 'STAFF'].includes(existingUser.role)) {
    throw createError({
      statusCode: 400,
      message: 'Only LAWYER and STAFF users can have default hourly rates'
    })
  }

  const { defaultHourlyRate } = parsed.data

  await db
    .update(schema.users)
    .set({
      defaultHourlyRate,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, userId))

  // Log the activity
  const userName = await resolveEntityName('user', userId)

  await logActivity({
    type: 'USER_RATE_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: userName ? { type: 'user', id: userId, name: userName } : undefined,
    event,
    details: {
      previousRate: existingUser.defaultHourlyRate,
      newRate: defaultHourlyRate
    }
  })

  // Fetch updated user
  const [updated] = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
      role: schema.users.role,
      defaultHourlyRate: schema.users.defaultHourlyRate
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to retrieve updated user'
    })
  }

  return {
    userId: updated.id,
    userName: [updated.firstName, updated.lastName].filter(Boolean).join(' ') || updated.email || 'Unknown',
    role: updated.role,
    defaultHourlyRate: updated.defaultHourlyRate
  }
})
