import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  // Check if user exists
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get()

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Prevent deleting yourself
  const currentUser = getAuthUser(event)
  if (currentUser.id === id) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete your own account'
    })
  }

  // Delete user
  await db
    .delete(schema.users)
    .where(eq(schema.users.id, id))

  return { success: true }
})
