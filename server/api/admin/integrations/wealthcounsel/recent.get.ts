/**
 * GET /api/admin/integrations/wealthcounsel/recent
 *
 * Get recent WealthCounsel imports (completed estate plans)
 */

import { useDrizzle, schema } from '../../../../db'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = useDrizzle()

  // Get recent plan versions that were imported from WealthCounsel
  const recentVersions = await db.select({
    versionId: schema.planVersions.id,
    planId: schema.planVersions.planId,
    version: schema.planVersions.version,
    changeType: schema.planVersions.changeType,
    createdAt: schema.planVersions.createdAt,
    planName: schema.estatePlans.planName,
    planType: schema.estatePlans.planType,
    planStatus: schema.estatePlans.status
  })
    .from(schema.planVersions)
    .innerJoin(schema.estatePlans, eq(schema.planVersions.planId, schema.estatePlans.id))
    .where(eq(schema.planVersions.sourceType, 'WEALTHCOUNSEL'))
    .orderBy(desc(schema.planVersions.createdAt))
    .limit(10)

  const recentImports = recentVersions.map(v => ({
    id: v.versionId,
    planId: v.planId,
    planName: v.planName || 'Unnamed Plan',
    planType: v.planType,
    status: 'completed' as const,
    changeType: v.changeType,
    importedAt: v.createdAt?.toISOString() || new Date().toISOString()
  }))

  return {
    imports: recentImports,
    count: recentImports.length
  }
})
