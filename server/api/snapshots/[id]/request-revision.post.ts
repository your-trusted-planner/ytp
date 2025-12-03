// Request revision on a snapshot
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const snapshotId = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  if (!snapshotId) {
    throw createError({
      statusCode: 400,
      message: 'Snapshot ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get snapshot
  const snapshot = await db.prepare(`
    SELECT sv.*, cj.client_id
    FROM snapshot_versions sv
    JOIN client_journeys cj ON sv.client_journey_id = cj.id
    WHERE sv.id = ?
  `).bind(snapshotId).first()

  if (!snapshot) {
    throw createError({
      statusCode: 404,
      message: 'Snapshot not found'
    })
  }

  // Check if user has permission
  const isClient = user.id === snapshot.client_id
  const isCouncil = user.role === 'LAWYER' || user.role === 'ADMIN'

  if (!isClient && !isCouncil) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Update snapshot with revision request
  await db.prepare(`
    UPDATE snapshot_versions
    SET 
      status = 'UNDER_REVISION',
      ${isClient ? 'client_feedback' : 'council_notes'} = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.feedback || body.notes || 'Revision requested',
    Date.now(),
    snapshotId
  ).run()

  return { success: true }
})

