// Get all payments for a specific matter
// STUB: Full implementation in Phase 3
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const matterId = getRouterParam(event, 'matterId')

  // Only lawyers/admins can view payments
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const db = hubDatabase()

  // Get all payments for this matter
  const payments = await db.prepare(`
    SELECT *
    FROM payments
    WHERE matter_id = ?
    ORDER BY created_at DESC
  `).bind(matterId).all()

  return {
    payments: payments.results || []
  }
})
