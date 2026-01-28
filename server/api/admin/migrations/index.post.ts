/**
 * POST /api/admin/migrations
 * Start a new migration run
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'
import { startMigrationRun, clearLookupCaches } from '../../../queue/lawmatics-import'
import type { ImportPhase } from '../../../queue/lawmatics-import'

const startMigrationSchema = z.object({
  integrationId: z.string().min(1),
  runType: z.enum(['FULL', 'INCREMENTAL']),
  entityTypes: z.array(z.enum(['users', 'contacts', 'prospects', 'notes', 'activities']))
    .min(1, 'At least one entity type must be selected')
})

export default defineEventHandler(async (event) => {

  const body = await readBody(event)
  const result = startMigrationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const { integrationId, runType, entityTypes } = result.data

  const db = useDrizzle()

  // Verify integration exists and is connected
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, integrationId))
    .get()

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'Integration not found'
    })
  }

  if (integration.status === 'ERROR') {
    throw createError({
      statusCode: 400,
      message: 'Integration is in error state. Please test the connection first.'
    })
  }

  if (!integration.credentialsKey) {
    throw createError({
      statusCode: 400,
      message: 'Integration has no credentials configured.'
    })
  }

  // Check for existing running migration
  const existingRun = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.integrationId, integrationId))
    .all()

  const runningMigration = existingRun.find(r =>
    r.status === 'RUNNING' || r.status === 'PENDING'
  )

  if (runningMigration) {
    throw createError({
      statusCode: 409,
      message: 'A migration is already in progress for this integration',
      data: { existingRunId: runningMigration.id }
    })
  }

  // Create migration run record
  const runId = nanoid()
  const now = new Date()

  await db.insert(schema.migrationRuns).values({
    id: runId,
    integrationId,
    runType,
    entityTypes: JSON.stringify(entityTypes),
    status: 'PENDING',
    processedEntities: 0,
    createdRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    errorCount: 0,
    createdAt: now,
    updatedAt: now
  })

  // Clear lookup caches for fresh import
  clearLookupCaches()

  // Get filter for incremental sync
  let filter: { updatedSince?: string } | undefined
  if (runType === 'INCREMENTAL' && integration.lastSyncTimestamps) {
    const timestamps = JSON.parse(integration.lastSyncTimestamps) as Record<string, string>
    const firstPhase = entityTypes[0]
    if (firstPhase && timestamps[firstPhase]) {
      filter = { updatedSince: timestamps[firstPhase] }
    }
  }

  // Queue the first page of the first phase
  try {
    // Get the queue binding from the event context
    const env = event.context.cloudflare?.env

    if (!env?.LAWMATICS_IMPORT_QUEUE) {
      // Update status to failed if queue not available
      await db.update(schema.migrationRuns)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(schema.migrationRuns.id, runId))

      throw createError({
        statusCode: 500,
        message: 'Queue not available. Migration cannot be started.'
      })
    }

    await startMigrationRun(env, runId, entityTypes as ImportPhase[], filter)

    // Update status to running
    await db.update(schema.migrationRuns)
      .set({
        status: 'RUNNING',
        startedAt: now,
        updatedAt: now
      })
      .where(eq(schema.migrationRuns.id, runId))

  } catch (error) {
    // Update status to failed
    await db.update(schema.migrationRuns)
      .set({
        status: 'FAILED',
        checkpoint: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        updatedAt: new Date()
      })
      .where(eq(schema.migrationRuns.id, runId))

    throw createError({
      statusCode: 500,
      message: 'Failed to start migration',
      data: { error: error instanceof Error ? error.message : String(error) }
    })
  }

  return {
    success: true,
    runId,
    message: 'Migration started successfully'
  }
})
