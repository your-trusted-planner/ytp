/**
 * POST /api/admin/migrations/:id/resume
 * Resume a paused migration
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { startMigrationRun } from '../../../../queue/lawmatics-import'
import type { ImportPhase } from '../../../../queue/lawmatics-import'

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

  if (run.status !== 'PAUSED') {
    throw createError({
      statusCode: 400,
      message: `Cannot resume migration with status: ${run.status}. Only PAUSED migrations can be resumed.`
    })
  }

  // Parse checkpoint to determine where to resume
  let resumePhase: ImportPhase = 'users'
  let resumePage = 1
  let filter: { updatedSince?: string } | undefined

  if (run.checkpoint) {
    try {
      const checkpoint = JSON.parse(run.checkpoint)
      if (checkpoint.phase) {
        resumePhase = checkpoint.phase as ImportPhase
      }
      if (checkpoint.page) {
        resumePage = checkpoint.page + 1 // Resume from next page
      }
    } catch {
      // Use defaults
    }
  }

  // Get integration for incremental filter
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, run.integrationId))
    .get()

  if (run.runType === 'INCREMENTAL' && integration?.lastSyncTimestamps) {
    const timestamps = JSON.parse(integration.lastSyncTimestamps)
    if (timestamps[resumePhase]) {
      filter = { updatedSince: timestamps[resumePhase] }
    }
  }

  // Get queue from env
  const env = event.context.cloudflare?.env

  if (!env?.LAWMATICS_IMPORT_QUEUE) {
    throw createError({
      statusCode: 500,
      message: 'Queue not available. Migration cannot be resumed.'
    })
  }

  // Queue the resume page
  const entityTypes = JSON.parse(run.entityTypes) as ImportPhase[]

  // Find the index of the resume phase and get remaining phases
  const phaseOrder: ImportPhase[] = ['users', 'contacts', 'prospects', 'notes', 'activities']
  const resumePhaseIndex = phaseOrder.indexOf(resumePhase)
  const remainingPhases = phaseOrder.slice(resumePhaseIndex).filter(p => entityTypes.includes(p))

  if (remainingPhases.length === 0) {
    // Migration was at the end, mark as complete
    await db.update(schema.migrationRuns)
      .set({
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.migrationRuns.id, id))

    return {
      success: true,
      message: 'Migration was already at the final phase. Marked as complete.'
    }
  }

  // Update status to running
  await db.update(schema.migrationRuns)
    .set({
      status: 'RUNNING',
      updatedAt: new Date()
    })
    .where(eq(schema.migrationRuns.id, id))

  // Queue the resume message
  const queue = env.LAWMATICS_IMPORT_QUEUE
  await queue.send({
    type: 'IMPORT_PAGE',
    runId: id,
    phase: resumePhase,
    page: resumePage,
    perPage: resumePhase === 'activities' ? 25 : 100,
    filter
  })

  return {
    success: true,
    message: `Migration resumed from ${resumePhase} page ${resumePage}`
  }
})
