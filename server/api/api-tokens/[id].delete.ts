// Revoke (delete) an API token
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Token ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get the token to verify ownership
  const token = await db.select()
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.id, id))
    .get()

  if (!token) {
    throw createError({
      statusCode: 404,
      message: 'Token not found'
    })
  }

  // Users can only delete their own tokens (unless admin)
  if (token.userId !== user.id && user.role !== 'ADMIN' && user.adminLevel < 2) {
    throw createError({
      statusCode: 403,
      message: 'Not authorized to delete this token'
    })
  }

  // Delete the token
  await db.delete(schema.apiTokens)
    .where(eq(schema.apiTokens.id, id))

  return {
    success: true,
    message: 'API token revoked successfully'
  }
})
