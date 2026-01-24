/**
 * GET /api/admin/migrations/:id
 * Get migration run status and progress
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Migration run ID is required'
    })
  }

  const db = useDrizzle()

  const run = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.id, id))
    .get()

  if (!run) {
    throw createError({
      statusCode: 404,
      message: 'Migration run not found'
    })
  }

  // Get integration info
  const integration = await db.select({
    id: schema.integrations.id,
    name: schema.integrations.name,
    type: schema.integrations.type
  })
    .from(schema.integrations)
    .where(eq(schema.integrations.id, run.integrationId))
    .get()

  // Get recent errors count
  const recentErrors = await db.select({ id: schema.migrationErrors.id })
    .from(schema.migrationErrors)
    .where(eq(schema.migrationErrors.runId, id))
    .limit(100)
    .all()

  // Parse checkpoint for current phase info
  let currentPhase: string | null = null
  let currentPage: number | null = null
  if (run.checkpoint) {
    try {
      const checkpoint = JSON.parse(run.checkpoint)
      currentPhase = checkpoint.phase || null
      currentPage = checkpoint.page || null
    } catch {
      // Ignore parse errors
    }
  }

  // Calculate progress percentage
  const progressPercentage = run.totalEntities && run.totalEntities > 0
    ? Math.round((run.processedEntities / run.totalEntities) * 100)
    : null

  // Estimate time remaining (rough calculation based on processing rate)
  let estimatedSecondsRemaining: number | null = null
  if (run.status === 'RUNNING' && run.startedAt && run.processedEntities > 0 && run.totalEntities) {
    const startTime = run.startedAt instanceof Date ? run.startedAt.getTime() : new Date(run.startedAt).getTime()
    const elapsedMs = Date.now() - startTime
    const recordsPerMs = run.processedEntities / elapsedMs
    const remainingRecords = run.totalEntities - run.processedEntities
    estimatedSecondsRemaining = Math.round(remainingRecords / recordsPerMs / 1000)
  }

  return {
    run: {
      id: run.id,
      integrationId: run.integrationId,
      integration: integration || { id: run.integrationId, name: 'Unknown', type: 'Unknown' },
      runType: run.runType,
      entityTypes: JSON.parse(run.entityTypes),
      status: run.status,
      totalEntities: run.totalEntities,
      processedEntities: run.processedEntities,
      createdRecords: run.createdRecords,
      updatedRecords: run.updatedRecords,
      skippedRecords: run.skippedRecords,
      errorCount: run.errorCount,
      progressPercent: progressPercentage,
      estimatedTimeRemaining: estimatedSecondsRemaining,
      currentPhase,
      currentPage,
      recentErrorCount: recentErrors.length,
      startedAt: run.startedAt instanceof Date ? run.startedAt.toISOString() : run.startedAt,
      completedAt: run.completedAt instanceof Date ? run.completedAt.toISOString() : run.completedAt,
      createdAt: run.createdAt instanceof Date ? run.createdAt.toISOString() : run.createdAt,
      updatedAt: run.updatedAt instanceof Date ? run.updatedAt.toISOString() : run.updatedAt
    }
  }
})
