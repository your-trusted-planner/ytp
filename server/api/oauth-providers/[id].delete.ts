import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  // Check if provider exists
  const provider = await db
    .select()
    .from(schema.oauthProviders)
    .where(eq(schema.oauthProviders.id, id))
    .get()

  if (!provider) {
    throw createError({
      statusCode: 404,
      message: 'Provider not found'
    })
  }

  // Delete provider
  await db
    .delete(schema.oauthProviders)
    .where(eq(schema.oauthProviders.id, id))

  return { success: true }
})
