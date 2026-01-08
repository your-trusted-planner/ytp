// Get all payments for a specific matter
// STUB: Full implementation in Phase 3
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'matterId')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all payments for this matter
  const payments = await db.select()
    .from(schema.payments)
    .where(eq(schema.payments.matterId, matterId))
    .orderBy(desc(schema.payments.createdAt))
    .all()

  return {
    payments
  }
})
