// Get matters for the currently logged-in client
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Find the client profile for this user
  const clientProfile = await db.select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, user.id))
    .get()

  if (!clientProfile) {
    // User is not a client, return empty array
    return { matters: [] }
  }

  // Get matters for this client
  const matters = await db.select({
    id: schema.matters.id,
    title: schema.matters.title,
    matterNumber: schema.matters.matterNumber,
    description: schema.matters.description,
    status: schema.matters.status,
    contractDate: schema.matters.contractDate,
    createdAt: schema.matters.createdAt,
    updatedAt: schema.matters.updatedAt
  })
    .from(schema.matters)
    .where(eq(schema.matters.clientId, clientProfile.id))
    .all()

  // Convert to snake_case for frontend compatibility
  return {
    matters: matters.map(m => ({
      id: m.id,
      title: m.title,
      matterNumber: m.matterNumber,
      matter_number: m.matterNumber,
      description: m.description,
      status: m.status,
      contractDate: m.contractDate instanceof Date ? m.contractDate.getTime() : m.contractDate,
      contract_date: m.contractDate instanceof Date ? m.contractDate.getTime() : m.contractDate,
      createdAt: m.createdAt instanceof Date ? m.createdAt.getTime() : m.createdAt,
      created_at: m.createdAt instanceof Date ? m.createdAt.getTime() : m.createdAt,
      updatedAt: m.updatedAt instanceof Date ? m.updatedAt.getTime() : m.updatedAt,
      updated_at: m.updatedAt instanceof Date ? m.updatedAt.getTime() : m.updatedAt
    }))
  }
})
