// Approve a snapshot (client or counsel)
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

  const isClient = user.id === snapshot.client_id
  const isCounsel = user.role === 'LAWYER' || user.role === 'ADMIN'

  if (!isClient && !isCounsel) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Update approval status
  if (isClient) {
    await db.prepare(`
      UPDATE snapshot_versions
      SET
        approved_by_client = 1,
        client_feedback = ?,
        status = CASE
          WHEN approved_by_counsel = 1 THEN 'APPROVED'
          ELSE 'UNDER_REVISION'
        END,
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.feedback || null,
      Date.now(),
      snapshotId
    ).run()
  } else if (isCounsel) {
    await db.prepare(`
      UPDATE snapshot_versions
      SET
        approved_by_counsel = 1,
        counsel_notes = ?,
        status = CASE
          WHEN approved_by_client = 1 THEN 'APPROVED'
          ELSE 'UNDER_REVISION'
        END,
        approved_at = CASE
          WHEN approved_by_client = 1 THEN ?
          ELSE approved_at
        END,
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.notes || null,
      Date.now(),
      Date.now(),
      snapshotId
    ).run()
  }

  // Check if both parties approved
  const updated = await db.prepare(`
    SELECT * FROM snapshot_versions WHERE id = ?
  `).bind(snapshotId).first()

  if (updated.approved_by_client && updated.approved_by_counsel) {
    // Both approved - mark as APPROVED and set approved_at
    await db.prepare(`
      UPDATE snapshot_versions
      SET status = 'APPROVED', approved_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), Date.now(), snapshotId).run()
  }

  return { success: true, bothApproved: updated.approved_by_client && updated.approved_by_counsel }
})



