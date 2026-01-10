import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Require admin level 2+ to delete users (role-based ADMIN check kept for backwards compatibility)
  const currentUser = getAuthUser(event)
  if (currentUser.adminLevel < 2 && currentUser.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Admin level 2+ required to delete users'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
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
