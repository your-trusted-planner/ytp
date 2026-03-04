/**
 * DELETE /api/profile/api-token
 * Revoke the current user's API token
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user
  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  await db.update(schema.users).set({
    apiTokenHash: null,
    apiTokenCreatedAt: null
  }).where(eq(schema.users.id, user.id))

  return { success: true }
})
