import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateAdminLevelSchema = z.object({
  adminLevel: z.number().int().min(0).max(10)
})

export default defineEventHandler(async (event) => {
  // Require admin level 2+ to modify admin levels
  const currentUser = requireAdminLevel(event, 2)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID required'
    })
  }

  const body = await readBody(event)
  const result = updateAdminLevelSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { adminLevel } = result.data

  // Prevent users from elevating their own admin level
  if (id === currentUser.id && adminLevel > currentUser.adminLevel) {
    throw createError({
      statusCode: 403,
      message: 'Cannot elevate your own admin level'
    })
  }

  // Prevent setting admin level higher than your own
  if (adminLevel > currentUser.adminLevel) {
    throw createError({
      statusCode: 403,
      message: 'Cannot set admin level higher than your own'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify target user exists
  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get()

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  await db
    .update(schema.users)
    .set({
      adminLevel,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, id))

  return {
    success: true,
    user: {
      id,
      adminLevel
    }
  }
})
