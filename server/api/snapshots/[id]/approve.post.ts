// Approve a snapshot (client or attorney)
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

  const isClient = user.id === snapshot.client_id
  const isAttorney = user.role === 'LAWYER' || user.role === 'ADMIN'

  if (!isClient && !isAttorney) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const now = new Date()

  // Update approval status
  if (isClient) {
    // Client approval - use raw SQL for conditional status update
    await db.run(sql`
      UPDATE snapshot_versions
      SET
        approved_by_client = 1,
        client_feedback = ${body.feedback || null},
        status = CASE
          WHEN approved_by_attorney = 1 THEN 'APPROVED'
          ELSE 'UNDER_REVISION'
        END,
        updated_at = ${now.getTime()}
      WHERE id = ${snapshotId}
    `)
  } else if (isAttorney) {
    // Attorney approval - use raw SQL for conditional status and approved_at update
    await db.run(sql`
      UPDATE snapshot_versions
      SET
        approved_by_attorney = 1,
        attorney_notes = ${body.notes || null},
        status = CASE
          WHEN approved_by_client = 1 THEN 'APPROVED'
          ELSE 'UNDER_REVISION'
        END,
        approved_at = CASE
          WHEN approved_by_client = 1 THEN ${now.getTime()}
          ELSE approved_at
        END,
        updated_at = ${now.getTime()}
      WHERE id = ${snapshotId}
    `)
  }

  // Check if both parties approved
  const updated = await db.select()
    .from(schema.snapshotVersions)
    .where(eq(schema.snapshotVersions.id, snapshotId))
    .get()

  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Snapshot not found after update'
    })
  }

  // If both approved, ensure status is APPROVED and approved_at is set
  if (updated.approvedByClient && updated.approvedByAttorney) {
    await db.update(schema.snapshotVersions)
      .set({
        status: 'APPROVED',
        approvedAt: now,
        updatedAt: now
      })
      .where(eq(schema.snapshotVersions.id, snapshotId))
  }

  return { success: true, bothApproved: updated.approvedByClient && updated.approvedByAttorney }
})



