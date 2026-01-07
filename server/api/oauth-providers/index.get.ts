// Get all OAuth providers (admin only)
export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()

  const providers = await db
    .select()
    .from(schema.oauthProviders)
    .orderBy(schema.oauthProviders.displayOrder)
    .all()

  return { providers }
})
