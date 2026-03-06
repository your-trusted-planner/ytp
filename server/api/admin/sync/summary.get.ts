/**
 * GET /api/admin/sync/summary
 * Returns sync health summary for the Lawmatics integration
 */

import { eq, desc, sql, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  // Get the Lawmatics integration
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'LAWMATICS'))
    .get()

  if (!integration) {
    return {
      connected: false,
      lastSync: null,
      entityCounts: {},
      localEditCounts: {},
      lastRunStatus: null,
      lastRunErrors: 0,
      totalImportedRecords: 0
    }
  }

  // Get last migration run
  const lastRun = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.integrationId, integration.id))
    .orderBy(desc(schema.migrationRuns.createdAt))
    .limit(1)
    .get()

  // Get error count from last run
  let lastRunErrors = 0
  if (lastRun) {
    lastRunErrors = lastRun.errorCount || 0
  }

  // Count imported records by entity type
  const peopleCounts = await db.all(sql`
    SELECT COUNT(*) as count FROM people
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
  `)

  const usersCounts = await db.all(sql`
    SELECT COUNT(*) as count FROM users
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
  `)

  const mattersCounts = await db.all(sql`
    SELECT COUNT(*) as count FROM matters
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
  `)

  const notesCounts = await db.all(sql`
    SELECT COUNT(*) as count FROM notes
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
  `)

  // Count records with local edits (locally modified fields)
  const peopleLocalEdits = await db.all(sql`
    SELECT COUNT(*) as count FROM people
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
      AND json_extract(import_metadata, '$.locallyModifiedFields') IS NOT NULL
      AND json_extract(import_metadata, '$.locallyModifiedFields') != '[]'
  `)

  const usersLocalEdits = await db.all(sql`
    SELECT COUNT(*) as count FROM users
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
      AND json_extract(import_metadata, '$.locallyModifiedFields') IS NOT NULL
      AND json_extract(import_metadata, '$.locallyModifiedFields') != '[]'
  `)

  const mattersLocalEdits = await db.all(sql`
    SELECT COUNT(*) as count FROM matters
    WHERE json_extract(import_metadata, '$.source') = 'LAWMATICS'
      AND json_extract(import_metadata, '$.locallyModifiedFields') IS NOT NULL
      AND json_extract(import_metadata, '$.locallyModifiedFields') != '[]'
  `)

  // Parse settings for auto-sync info
  let settings: any = {}
  if (integration.settings) {
    try {
      settings = JSON.parse(integration.settings)
    } catch { /* ignore */ }
  }

  const entityCounts = {
    people: (peopleCounts[0] as any)?.count || 0,
    users: (usersCounts[0] as any)?.count || 0,
    matters: (mattersCounts[0] as any)?.count || 0,
    notes: (notesCounts[0] as any)?.count || 0
  }

  const localEditCounts = {
    people: (peopleLocalEdits[0] as any)?.count || 0,
    users: (usersLocalEdits[0] as any)?.count || 0,
    matters: (mattersLocalEdits[0] as any)?.count || 0
  }

  const totalImported = Object.values(entityCounts).reduce((a, b) => a + b, 0)
  const totalLocalEdits = Object.values(localEditCounts).reduce((a, b) => a + b, 0)

  return {
    connected: integration.status === 'CONNECTED',
    integrationStatus: integration.status,
    syncEnabled: !!settings.syncEnabled,
    lastAutoSyncAt: settings.lastAutoSyncAt || null,
    lastSync: lastRun ? {
      id: lastRun.id,
      status: lastRun.status,
      runType: lastRun.runType,
      startedAt: lastRun.startedAt instanceof Date ? lastRun.startedAt.toISOString() : lastRun.startedAt,
      completedAt: lastRun.completedAt instanceof Date ? lastRun.completedAt.toISOString() : lastRun.completedAt,
      processedEntities: lastRun.processedEntities,
      createdRecords: lastRun.createdRecords,
      updatedRecords: lastRun.updatedRecords,
      skippedRecords: lastRun.skippedRecords,
      errorCount: lastRun.errorCount
    } : null,
    entityCounts,
    localEditCounts,
    totalImportedRecords: totalImported,
    totalLocalEdits,
    lastRunErrors
  }
})
