// Get all document uploads for a client journey
export default defineEventHandler(async (event) => {
  const clientJourneyId = getRouterParam(event, 'clientJourneyId')

  if (!clientJourneyId) {
    throw createError({
      statusCode: 400,
      message: 'Client journey ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get client journey to check authorization
  const clientJourney = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, clientJourneyId))
    .get()

  if (!clientJourney) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }

  // Check authorization - clients can only view their own journey's uploads
  requireClientAccess(event, clientJourney.clientId)

  // Get all uploads (we'll enrich with user info separately)
  const uploads = await db.select()
    .from(schema.documentUploads)
    .where(eq(schema.documentUploads.clientJourneyId, clientJourneyId))
    .orderBy(desc(schema.documentUploads.createdAt))
    .all()

  // Get unique user IDs to fetch
  const uploaderIds = [...new Set(uploads.map(u => u.uploadedByUserId).filter(Boolean))]
  const reviewerIds = [...new Set(uploads.map(u => u.reviewedByUserId).filter(Boolean))]
  const allUserIds = [...new Set([...uploaderIds, ...reviewerIds])]

  // Fetch all users in one query
  const users = allUserIds.length > 0
    ? await db.select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName
      })
      .from(schema.users)
      .where(inArray(schema.users.id, allUserIds))
      .all()
    : []

  // Create user lookup map
  const userMap = new Map(users.map(u => [u.id, u]))

  // Enrich uploads with user info
  const enrichedUploads = uploads.map(upload => {
    const uploader = userMap.get(upload.uploadedByUserId)
    const reviewer = upload.reviewedByUserId ? userMap.get(upload.reviewedByUserId) : null

    return {
      ...upload,
      uploaded_by_first_name: uploader?.firstName || null,
      uploaded_by_last_name: uploader?.lastName || null,
      reviewed_by_first_name: reviewer?.firstName || null,
      reviewed_by_last_name: reviewer?.lastName || null
    }
  })

  return {
    uploads: enrichedUploads
  }
})



