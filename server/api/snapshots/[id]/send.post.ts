// Send snapshot to client for review
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const snapshotId = getRouterParam(event, 'id')

  if (!snapshotId) {
    throw createError({
      statusCode: 400,
      message: 'Snapshot ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Update snapshot status to SENT
  await db.update(schema.snapshotVersions)
    .set({
      status: 'SENT',
      sentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.snapshotVersions.id, snapshotId))

  // TODO: Send email notification to client

  return { success: true }
})



