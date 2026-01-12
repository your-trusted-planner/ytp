// List all API tokens for the authenticated user
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all tokens for this user
  const tokens = await db.select({
    id: schema.apiTokens.id,
    name: schema.apiTokens.name,
    scopes: schema.apiTokens.scopes,
    expiresAt: schema.apiTokens.expiresAt,
    lastUsedAt: schema.apiTokens.lastUsedAt,
    createdAt: schema.apiTokens.createdAt
  })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, user.id))
    .all()

  // Format the response
  const formattedTokens = tokens.map(token => ({
    id: token.id,
    name: token.name,
    scopes: token.scopes ? JSON.parse(token.scopes) : null,
    expiresAt: token.expiresAt ? new Date(token.expiresAt * 1000).toISOString() : null,
    lastUsedAt: token.lastUsedAt ? new Date(token.lastUsedAt * 1000).toISOString() : null,
    createdAt: new Date(token.createdAt * 1000).toISOString(),
    // Check if expired
    isExpired: token.expiresAt ? new Date(token.expiresAt * 1000) < new Date() : false
  }))

  return {
    success: true,
    tokens: formattedTokens
  }
})
