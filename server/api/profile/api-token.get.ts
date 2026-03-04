/**
 * GET /api/profile/api-token
 * Check if the current user has an active API token
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const dbUser = await db
    .select({
      apiTokenHash: schema.users.apiTokenHash,
      apiTokenCreatedAt: schema.users.apiTokenCreatedAt
    })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .get()

  return {
    hasToken: !!dbUser?.apiTokenHash,
    createdAt: dbUser?.apiTokenCreatedAt || null
  }
})
