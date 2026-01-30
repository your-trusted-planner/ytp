// Get a user's default hourly rate
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get user with their default rate
  const [user] = await db
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

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Unknown'

  return {
    userId: user.id,
    userName,
    role: user.role,
    defaultHourlyRate: user.defaultHourlyRate || null
  }
})
