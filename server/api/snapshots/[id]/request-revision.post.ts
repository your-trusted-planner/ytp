// Request revision on a snapshot
export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const snapshotId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!snapshotId) {
    throw createError({
      statusCode: 400,
      message: 'Snapshot ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get snapshot
  const snapshot = await db.select({
    id: schema.snapshotVersions.id,
    clientJourneyId: schema.snapshotVersions.clientJourneyId,
    versionNumber: schema.snapshotVersions.versionNumber,
    content: schema.snapshotVersions.content,
    generatedPdfPath: schema.snapshotVersions.generatedPdfPath,
    status: schema.snapshotVersions.status,
    sentAt: schema.snapshotVersions.sentAt,
    approvedAt: schema.snapshotVersions.approvedAt,
    approvedByClient: schema.snapshotVersions.approvedByClient,
    approvedByAttorney: schema.snapshotVersions.approvedByAttorney,
    clientFeedback: schema.snapshotVersions.clientFeedback,
    attorneyNotes: schema.snapshotVersions.attorneyNotes,
    createdAt: schema.snapshotVersions.createdAt,
    updatedAt: schema.snapshotVersions.updatedAt,
    client_id: schema.clientJourneys.clientId
  })
    .from(schema.snapshotVersions)
    .innerJoin(schema.clientJourneys, eq(schema.snapshotVersions.clientJourneyId, schema.clientJourneys.id))
    .where(eq(schema.snapshotVersions.id, snapshotId))
    .get()

  if (!snapshot) {
    throw createError({
      statusCode: 404,
      message: 'Snapshot not found'
    })
  }

  // Check if user has permission
  const isClient = user.id === snapshot.client_id
  const isAttorney = user.role === 'LAWYER' || user.role === 'ADMIN'

  if (!isClient && !isAttorney) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Update snapshot with revision request
  // Use different fields based on who is requesting revision
  const feedbackText = body.feedback || body.notes || 'Revision requested'
  const now = new Date()

  if (isClient) {
    await db.update(schema.snapshotVersions)
      .set({
        status: 'UNDER_REVISION',
        clientFeedback: feedbackText,
        updatedAt: now
      })
      .where(eq(schema.snapshotVersions.id, snapshotId))
  } else {
    await db.update(schema.snapshotVersions)
      .set({
        status: 'UNDER_REVISION',
        attorneyNotes: feedbackText,
        updatedAt: now
      })
      .where(eq(schema.snapshotVersions.id, snapshotId))
  }

  return { success: true }
})



