// Get matter billing rates
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const matterId = getRouterParam(event, 'matterId')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify matter exists
  const [matter] = await db
    .select({
      id: schema.matters.id,
      title: schema.matters.title,
      matterNumber: schema.matters.matterNumber
    })
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .limit(1)

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Get billing rates
  const [rates] = await db
    .select()
    .from(schema.matterBillingRates)
    .where(eq(schema.matterBillingRates.matterId, matterId))
    .limit(1)

  return {
    matterId,
    matterTitle: matter.title,
    matterNumber: matter.matterNumber,
    attorneyRate: rates?.attorneyRate || null,
    staffRate: rates?.staffRate || null,
    userRates: rates?.userRates ? JSON.parse(rates.userRates) : {},
    notes: rates?.notes || null,
    effectiveDate: rates?.effectiveDate || null
  }
})
