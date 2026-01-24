/**
 * GET /api/admin/migrations
 * List migration runs with pagination and filtering
 */

import { desc, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)
  const integrationId = query.integrationId as string | undefined
  const status = query.status as string | undefined

  const db = useDrizzle()
  const offset = (page - 1) * limit

  // Build query
  let runsQuery = db
    .select({
      id: schema.migrationRuns.id,
      integrationId: schema.migrationRuns.integrationId,
      runType: schema.migrationRuns.runType,
      entityTypes: schema.migrationRuns.entityTypes,
      status: schema.migrationRuns.status,
      totalEntities: schema.migrationRuns.totalEntities,
      processedEntities: schema.migrationRuns.processedEntities,
      createdRecords: schema.migrationRuns.createdRecords,
      updatedRecords: schema.migrationRuns.updatedRecords,
      skippedRecords: schema.migrationRuns.skippedRecords,
      errorCount: schema.migrationRuns.errorCount,
      startedAt: schema.migrationRuns.startedAt,
      completedAt: schema.migrationRuns.completedAt,
      createdAt: schema.migrationRuns.createdAt
    })
    .from(schema.migrationRuns)
    .orderBy(desc(schema.migrationRuns.createdAt))
    .limit(limit)
    .offset(offset)

  // Apply filters
  if (integrationId) {
    runsQuery = runsQuery.where(eq(schema.migrationRuns.integrationId, integrationId)) as typeof runsQuery
  }

  if (status) {
    runsQuery = runsQuery.where(eq(schema.migrationRuns.status, status as any)) as typeof runsQuery
  }

  const runs = await runsQuery.all()

  // Get total count for pagination
  const countResult = await db
    .select({ count: schema.migrationRuns.id })
    .from(schema.migrationRuns)
    .all()
  const totalCount = countResult.length

  return {
    runs: runs.map(run => ({
      id: run.id,
      integrationId: run.integrationId,
      runType: run.runType,
      entityTypes: JSON.parse(run.entityTypes),
      status: run.status,
      totalEntities: run.totalEntities,
      processedEntities: run.processedEntities,
      createdRecords: run.createdRecords,
      updatedRecords: run.updatedRecords,
      skippedRecords: run.skippedRecords,
      errorCount: run.errorCount,
      progressPercent: run.totalEntities
        ? Math.round((run.processedEntities / run.totalEntities) * 100)
        : null,
      currentPhase: null, // TODO: Add to schema if needed
      estimatedTimeRemaining: null, // TODO: Calculate if needed
      startedAt: run.startedAt instanceof Date ? run.startedAt.toISOString() : run.startedAt,
      completedAt: run.completedAt instanceof Date ? run.completedAt.toISOString() : run.completedAt,
      createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : run.createdAt
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  }
})
