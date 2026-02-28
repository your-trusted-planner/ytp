/**
 * Cloudflare Scheduled (Cron) Handler Plugin
 *
 * Handles cron trigger events for automated Lawmatics sync.
 * Runs every 4 hours (configured in wrangler.jsonc).
 *
 * On each trigger:
 * 1. Finds all LAWMATICS integrations that are CONNECTED
 * 2. Checks integration settings for syncEnabled: true
 * 3. Ensures no RUNNING/PENDING migration exists
 * 4. Creates an INCREMENTAL migration run and queues it
 */

import { nanoid } from 'nanoid'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled' as any, async ({ event, env }: { event: any; env: any }) => {
    console.log('[Scheduled Sync] Cron trigger fired')

    try {
      await handleScheduledSync(env)
    } catch (error) {
      console.error('[Scheduled Sync] Error:', error)
    }
  })

  console.log('[Scheduled Sync] Cloudflare scheduled handler registered')
})

async function handleScheduledSync(env: any): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Find all Lawmatics integrations that are connected
  const integrations = await db.select()
    .from(schema.integrations)
    .where(and(
      eq(schema.integrations.type, 'LAWMATICS'),
      eq(schema.integrations.status, 'CONNECTED')
    ))
    .all()

  if (integrations.length === 0) {
    console.log('[Scheduled Sync] No connected Lawmatics integrations found')
    return
  }

  for (const integration of integrations) {
    try {
      await processIntegrationSync(db, schema, integration, env)
    } catch (error) {
      console.error(`[Scheduled Sync] Error processing integration ${integration.id}:`, error)
    }
  }
}

async function processIntegrationSync(
  db: any,
  schema: any,
  integration: any,
  env: any
): Promise<void> {
  const { eq } = await import('drizzle-orm')

  // Check integration settings for auto-sync
  let settings: any = {}
  if (integration.settings) {
    try {
      settings = JSON.parse(integration.settings)
    } catch {
      console.warn(`[Scheduled Sync] Invalid settings JSON for integration ${integration.id}`)
    }
  }

  if (!settings.syncEnabled) {
    console.log(`[Scheduled Sync] Auto-sync disabled for integration ${integration.id}`)
    return
  }

  // Check no RUNNING or PENDING migration exists
  const existingRuns = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.integrationId, integration.id))
    .all()

  const activeRun = existingRuns.find((r: any) =>
    r.status === 'RUNNING' || r.status === 'PENDING'
  )

  if (activeRun) {
    console.log(`[Scheduled Sync] Skipping integration ${integration.id} — active run ${activeRun.id} (${activeRun.status})`)
    return
  }

  // Determine entity types to sync
  const entityTypes = settings.syncEntityTypes?.length
    ? settings.syncEntityTypes
    : ['users', 'contacts', 'prospects', 'notes', 'activities']

  // Get filter for incremental sync
  let filter: { updatedSince?: string } | undefined
  if (integration.lastSyncTimestamps) {
    try {
      const timestamps = JSON.parse(integration.lastSyncTimestamps)
      const firstPhase = entityTypes[0]
      if (firstPhase && timestamps[firstPhase]) {
        filter = { updatedSince: timestamps[firstPhase] }
      }
    } catch {
      // No valid timestamps, do full incremental without filter
    }
  }

  // Create migration run
  const runId = nanoid()
  const now = new Date()

  await db.insert(schema.migrationRuns).values({
    id: runId,
    integrationId: integration.id,
    runType: 'INCREMENTAL',
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

  // Queue the migration
  const { startMigrationRun, clearLookupCaches } = await import('../queue/lawmatics-import')
  clearLookupCaches()

  if (!env?.LAWMATICS_IMPORT_QUEUE) {
    console.error('[Scheduled Sync] Queue not available — cannot start sync')
    await db.update(schema.migrationRuns)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(eq(schema.migrationRuns.id, runId))
    return
  }

  await startMigrationRun(env, runId, entityTypes, filter)

  // Update run to RUNNING
  await db.update(schema.migrationRuns)
    .set({
      status: 'RUNNING',
      startedAt: now,
      updatedAt: now
    })
    .where(eq(schema.migrationRuns.id, runId))

  // Update lastAutoSyncAt in settings
  settings.lastAutoSyncAt = now.toISOString()
  await db.update(schema.integrations)
    .set({ settings: JSON.stringify(settings), updatedAt: now })
    .where(eq(schema.integrations.id, integration.id))

  console.log(`[Scheduled Sync] Started incremental sync run ${runId} for integration ${integration.id} with entities: ${entityTypes.join(', ')}`)
}
