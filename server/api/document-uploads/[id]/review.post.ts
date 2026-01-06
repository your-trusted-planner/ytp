// Review a document upload (approve/reject)
export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  // Only lawyers/admins can review uploads
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  const uploadId = getRouterParam(event, 'id')

  if (!uploadId) {
    throw createError({
      statusCode: 400,
      message: 'Upload ID is required'
    })
  }

  const body = await readBody(event)
  const db = hubDatabase()

  // Update upload review status
  await db.prepare(`
    UPDATE document_uploads
    SET 
      status = ?,
      reviewed_by_user_id = ?,
      reviewed_at = ?,
      review_notes = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.status || 'REVIEWED',
    user.id,
    Date.now(),
    body.reviewNotes || null,
    Date.now(),
    uploadId
  ).run()

  return { success: true }
})



