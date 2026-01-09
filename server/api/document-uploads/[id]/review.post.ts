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
  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()
  const now = new Date()

  // Update upload review status
  await db.update(schema.documentUploads)
    .set({
      status: body.status || 'REVIEWED',
      reviewedByUserId: user.id,
      reviewedAt: now,
      reviewNotes: body.reviewNotes || null,
      updatedAt: now
    })
    .where(eq(schema.documentUploads.id, uploadId))

  return { success: true }
})



