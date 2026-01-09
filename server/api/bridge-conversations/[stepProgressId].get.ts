// Get conversation messages for a bridge step
export default defineEventHandler(async (event) => {
  const stepProgressId = getRouterParam(event, 'stepProgressId')

  if (!stepProgressId) {
    throw createError({
      statusCode: 400,
      message: 'Step progress ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get messages
  const conversations = await db.select()
    .from(schema.bridgeConversations)
    .where(eq(schema.bridgeConversations.stepProgressId, stepProgressId))
    .orderBy(schema.bridgeConversations.createdAt)
    .all()

  // Get unique user IDs
  const userIds = [...new Set(conversations.map(c => c.userId).filter(Boolean) as string[])]

  // Fetch users in batch
  const users = userIds.length > 0
    ? await db.select({
        id: schema.users.id,
        first_name: schema.users.firstName,
        last_name: schema.users.lastName,
        role: schema.users.role,
        avatar: schema.users.avatar
      })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds))
      .all()
    : []

  // Create user lookup map
  const userMap = new Map(users.map(u => [u.id, u]))

  // Enrich messages with user info
  const messages = conversations.map(bc => {
    const user = bc.userId ? userMap.get(bc.userId) : null
    return {
      ...bc,
      first_name: user?.first_name || null,
      last_name: user?.last_name || null,
      role: user?.role || null,
      avatar: user?.avatar || null
    }
  })

  return {
    messages
  }
})



