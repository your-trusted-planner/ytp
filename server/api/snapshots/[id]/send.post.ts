// Send snapshot to client for review
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const snapshotId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can send snapshots
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!snapshotId) {
    throw createError({
      statusCode: 400,
      message: 'Snapshot ID is required'
    })
  }

  const db = hubDatabase()

  // Update snapshot status to SENT
  await db.prepare(`
    UPDATE snapshot_versions
    SET status = 'SENT', sent_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(Date.now(), Date.now(), snapshotId).run()

  // TODO: Send email notification to client

  return { success: true }
})



