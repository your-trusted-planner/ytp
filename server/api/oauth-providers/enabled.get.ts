// Get all enabled OAuth providers (public endpoint for login page)
export default defineEventHandler(async (event) => {
  const { useDrizzle, schema } = await import('../../database')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  const providers = await db
    .select()
    .from(schema.oauthProviders)
    .where(eq(schema.oauthProviders.isEnabled, true))
    .orderBy(schema.oauthProviders.displayOrder)
    .all()

  return { providers }
})
