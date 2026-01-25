/**
 * Cloudflare Queue Consumer for Lawmatics Data Import
 *
 * Handles long-running data migration from Lawmatics CRM.
 * Processes one page at a time to stay within Workers limits.
 *
 * Message Types:
 * - IMPORT_PAGE: Fetch and process a single page of data
 * - PHASE_COMPLETE: Transition to the next import phase
 */

import type { MessageBatch, Message } from '@cloudflare/workers-types'
import { nanoid } from 'nanoid'

// ===================================
// MESSAGE TYPES
// ===================================

export type ImportPhase = 'users' | 'contacts' | 'prospects' | 'notes' | 'activities'

export interface ImportPageMessage {
  type: 'IMPORT_PAGE'
  runId: string
  phase: ImportPhase
  page: number
  perPage: number
  filter?: {
    updatedSince?: string
  }
}

export interface PhaseCompleteMessage {
  type: 'PHASE_COMPLETE'
  runId: string
  phase: ImportPhase
}

export type LawmaticsImportMessage = ImportPageMessage | PhaseCompleteMessage

// Phase order for sequential processing
const PHASE_ORDER: ImportPhase[] = ['users', 'contacts', 'prospects', 'notes', 'activities']

// Default page sizes per phase
const PAGE_SIZES: Record<ImportPhase, number> = {
  users: 100,
  contacts: 100,
  prospects: 100,
  notes: 100,
  activities: 25 // Activities are larger, use smaller pages
}

// ===================================
// QUEUE CONSUMER
// ===================================

export default {
  async queue(batch: MessageBatch, env: any) {
    console.log(`[Lawmatics Import] Processing batch of ${batch.messages.length} messages`)

    for (const message of batch.messages) {
      const body = message.body as LawmaticsImportMessage

      try {
        switch (body.type) {
          case 'IMPORT_PAGE':
            await handleImportPage(body, message, env)
            break

          case 'PHASE_COMPLETE':
            await handlePhaseComplete(body, message, env)
            break

          default:
            console.error(`[Lawmatics Import] Unknown message type: ${(body as any).type}`)
            message.ack()
        }
      } catch (error) {
        console.error(`[Lawmatics Import] Error processing message:`, error)

        // Log error to database
        await logMigrationError(body.runId, {
          phase: 'phase' in body ? body.phase : 'unknown',
          page: 'page' in body ? body.page : undefined,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })

        // Retry the message (up to max_retries)
        message.retry()
      }
    }
  }
}

// ===================================
// MESSAGE HANDLERS
// ===================================

async function handleImportPage(
  msg: ImportPageMessage,
  message: Message,
  env: any
): Promise<void> {
  const { runId, phase, page, perPage, filter } = msg

  console.log(`[Lawmatics Import] Processing ${phase} page ${page} for run ${runId}`)

  // Get migration run and integration
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const run = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.id, runId))
    .get()

  if (!run) {
    console.error(`[Lawmatics Import] Migration run ${runId} not found`)
    message.ack()
    return
  }

  if (run.status === 'CANCELLED' || run.status === 'PAUSED') {
    console.log(`[Lawmatics Import] Run ${runId} is ${run.status}, skipping`)
    message.ack()
    return
  }

  // Get integration credentials
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, run.integrationId))
    .get()

  if (!integration || !integration.credentialsKey) {
    console.error(`[Lawmatics Import] Integration not found for run ${runId}`)
    await updateRunStatus(runId, 'FAILED', 'Integration not found')
    message.ack()
    return
  }

  // Get Lawmatics client (pass env context for decryption)
  // Enable debug mode to log pagination details
  const { createLawmaticsClientFromIntegration } = await import('../utils/lawmatics-client')
  const client = await createLawmaticsClientFromIntegration(
    { cloudflareEnv: env },
    integration.id,
    integration.credentialsKey,
    { debug: true }
  )

  // Fetch page based on phase
  let pageResult: { data: any[]; hasMore: boolean; totalCount?: number }

  switch (phase) {
    case 'users':
      const usersResult = await client.fetchUsers({ page, perPage, updatedSince: filter?.updatedSince })
      pageResult = {
        data: usersResult.data,
        hasMore: usersResult.pagination.hasMore,
        totalCount: usersResult.pagination.totalCount
      }
      break

    case 'contacts':
      const contactsResult = await client.fetchContacts({ page, perPage, updatedSince: filter?.updatedSince })
      pageResult = {
        data: contactsResult.data,
        hasMore: contactsResult.pagination.hasMore,
        totalCount: contactsResult.pagination.totalCount
      }
      break

    case 'prospects':
      const prospectsResult = await client.fetchProspects({ page, perPage, updatedSince: filter?.updatedSince })
      pageResult = {
        data: prospectsResult.data,
        hasMore: prospectsResult.pagination.hasMore,
        totalCount: prospectsResult.pagination.totalCount
      }
      break

    case 'notes':
      const notesResult = await client.fetchAllNotes({ perPage, updatedSince: filter?.updatedSince })
      // For notes, we fetch all at once since they're typically smaller
      pageResult = { data: notesResult, hasMore: false }
      break

    case 'activities':
      const activitiesResult = await client.fetchActivities({ page, perPage, updatedSince: filter?.updatedSince })
      pageResult = {
        data: activitiesResult.data,
        hasMore: activitiesResult.pagination.hasMore,
        totalCount: activitiesResult.pagination.totalCount
      }
      break

    default:
      console.error(`[Lawmatics Import] Unknown phase: ${phase}`)
      message.ack()
      return
  }

  console.log(`[Lawmatics Import] Fetched ${pageResult.data.length} ${phase} records`)

  // Transform and upsert records
  const { processedCount, createdCount, updatedCount, errors } = await processRecords(
    phase,
    pageResult.data,
    runId
  )

  // Update progress
  await updateRunProgress(runId, {
    processedEntities: processedCount,
    createdRecords: createdCount,
    updatedRecords: updatedCount,
    errorCount: errors.length,
    checkpoint: {
      phase,
      page,
      timestamp: new Date().toISOString()
    }
  })

  // Log any errors
  for (const error of errors) {
    await logMigrationError(runId, {
      phase,
      externalId: error.externalId,
      error: error.message,
      errorType: error.type
    })
  }

  // Queue next page or complete phase
  if (pageResult.hasMore) {
    await queueNextPage(env, {
      runId,
      phase,
      page: page + 1,
      perPage,
      filter
    })
  } else {
    await queuePhaseComplete(env, { runId, phase })
  }

  message.ack()
}

async function handlePhaseComplete(
  msg: PhaseCompleteMessage,
  message: Message,
  env: any
): Promise<void> {
  const { runId, phase } = msg

  console.log(`[Lawmatics Import] Phase ${phase} complete for run ${runId}`)

  // Get run to check which phases are configured
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const run = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.id, runId))
    .get()

  if (!run) {
    console.error(`[Lawmatics Import] Migration run ${runId} not found`)
    message.ack()
    return
  }

  const configuredPhases = JSON.parse(run.entityTypes) as ImportPhase[]
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase)
  const nextPhases = PHASE_ORDER.slice(currentPhaseIndex + 1)
    .filter(p => configuredPhases.includes(p))

  if (nextPhases.length > 0) {
    // Start next phase
    const nextPhase = nextPhases[0]
    console.log(`[Lawmatics Import] Starting next phase: ${nextPhase}`)

    // Get filter from integration settings
    const integration = await db.select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, run.integrationId))
      .get()

    let filter: { updatedSince?: string } | undefined
    if (run.runType === 'INCREMENTAL' && integration?.lastSyncTimestamps) {
      const timestamps = JSON.parse(integration.lastSyncTimestamps)
      if (timestamps[nextPhase]) {
        filter = { updatedSince: timestamps[nextPhase] }
      }
    }

    await queueNextPage(env, {
      runId,
      phase: nextPhase,
      page: 1,
      perPage: PAGE_SIZES[nextPhase],
      filter
    })
  } else {
    // All phases complete
    console.log(`[Lawmatics Import] All phases complete for run ${runId}`)
    await updateRunStatus(runId, 'COMPLETED')

    // Update last sync timestamps on integration
    await updateIntegrationSyncTimestamps(run.integrationId)
  }

  message.ack()
}

// ===================================
// RECORD PROCESSING
// ===================================

interface ProcessResult {
  processedCount: number
  createdCount: number
  updatedCount: number
  errors: Array<{ externalId?: string; message: string; type: string }>
}

// Cache for lookup maps to avoid rebuilding on each page
let userLookupCache: Map<string, string> | null = null
let clientLookupCache: Map<string, string> | null = null
let peopleLookupCache: Map<string, string> | null = null
let matterLookupCache: Map<string, string> | null = null
let existingEmailsCache: Set<string> | null = null

async function getOrBuildUserLookup(): Promise<Map<string, string>> {
  if (!userLookupCache) {
    const { buildUserLookupMap } = await import('../utils/lawmatics-upsert')
    userLookupCache = await buildUserLookupMap('LAWMATICS')
  }
  return userLookupCache
}

async function getOrBuildClientLookup(): Promise<Map<string, string>> {
  if (!clientLookupCache) {
    const { buildClientLookupMap } = await import('../utils/lawmatics-upsert')
    clientLookupCache = await buildClientLookupMap('LAWMATICS')
  }
  return clientLookupCache
}

async function getOrBuildPeopleLookup(): Promise<Map<string, string>> {
  if (!peopleLookupCache) {
    const { buildPeopleLookupMap } = await import('../utils/lawmatics-upsert')
    peopleLookupCache = await buildPeopleLookupMap('LAWMATICS')
  }
  return peopleLookupCache
}

async function getOrBuildMatterLookup(): Promise<Map<string, string>> {
  if (!matterLookupCache) {
    const { buildMatterLookupMap } = await import('../utils/lawmatics-upsert')
    matterLookupCache = await buildMatterLookupMap('LAWMATICS')
  }
  return matterLookupCache
}

async function getExistingEmails(): Promise<Set<string>> {
  if (!existingEmailsCache) {
    const { useDrizzle, schema } = await import('../db')
    const db = useDrizzle()
    const users = await db.select({ email: schema.users.email }).from(schema.users).all()
    existingEmailsCache = new Set(
      users.map(u => u.email?.toLowerCase()).filter((e): e is string => !!e)
    )
  }
  return existingEmailsCache
}

// Clear caches when starting a new run
export function clearLookupCaches(): void {
  userLookupCache = null
  clientLookupCache = null
  peopleLookupCache = null
  matterLookupCache = null
  existingEmailsCache = null
}

async function processRecords(
  phase: ImportPhase,
  records: any[],
  runId: string
): Promise<ProcessResult> {
  const transformers = await import('../utils/lawmatics-transformers')
  const upsert = await import('../utils/lawmatics-upsert')

  const result: ProcessResult = {
    processedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    errors: []
  }

  switch (phase) {
    case 'users': {
      for (const record of records) {
        try {
          const transformed = transformers.transformUser(record, { importRunId: runId })
          const upsertResult = await upsert.upsertUser(transformed)

          result.processedCount++
          if (upsertResult.action === 'created') result.createdCount++
          else if (upsertResult.action === 'updated') result.updatedCount++

          // Update cache
          if (userLookupCache) {
            userLookupCache.set(record.id, upsertResult.id)
          }
        } catch (error) {
          result.errors.push({
            externalId: record.id,
            message: error instanceof Error ? error.message : String(error),
            type: 'TRANSFORM'
          })
        }
      }
      break
    }

    case 'contacts': {
      // Contacts are imported as people (not clients)
      for (const record of records) {
        try {
          const transformed = transformers.transformContactToPerson(record, {
            importRunId: runId
          })
          const upsertResult = await upsert.upsertPerson(transformed)

          result.processedCount++
          if (upsertResult.action === 'created') result.createdCount++
          else if (upsertResult.action === 'updated') result.updatedCount++

          // Update people cache
          if (peopleLookupCache) {
            peopleLookupCache.set(record.id, upsertResult.id)
          }
        } catch (error) {
          result.errors.push({
            externalId: record.id,
            message: error instanceof Error ? error.message : String(error),
            type: 'TRANSFORM'
          })
        }
      }
      break
    }

    case 'prospects': {
      const clientLookup = await getOrBuildClientLookup()
      const userLookup = await getOrBuildUserLookup()

      for (const record of records) {
        try {
          const transformed = transformers.transformProspect(record, {
            importRunId: runId,
            clientLookup: (externalId) => clientLookup.get(externalId) || null,
            userLookup: (externalId) => userLookup.get(externalId) || null
          })

          if (!transformed) {
            // Skip - couldn't resolve client
            result.errors.push({
              externalId: record.id,
              message: 'Could not resolve client for prospect',
              type: 'TRANSFORM'
            })
            continue
          }

          const upsertResult = await upsert.upsertMatter(transformed)

          result.processedCount++
          if (upsertResult.action === 'created') result.createdCount++
          else if (upsertResult.action === 'updated') result.updatedCount++

          // Update cache
          if (matterLookupCache) {
            matterLookupCache.set(record.id, upsertResult.id)
          }
        } catch (error) {
          result.errors.push({
            externalId: record.id,
            message: error instanceof Error ? error.message : String(error),
            type: 'TRANSFORM'
          })
        }
      }
      break
    }

    case 'notes': {
      const peopleLookup = await getOrBuildPeopleLookup()
      const matterLookup = await getOrBuildMatterLookup()
      const userLookup = await getOrBuildUserLookup()

      // Get a default user ID for notes without a creator
      const { useDrizzle, schema } = await import('../db')
      const db = useDrizzle()
      const defaultUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .limit(1)
        .get()
      const defaultUserId = defaultUser?.id || 'system'

      for (const record of records) {
        try {
          const transformed = transformers.transformNote(record, {
            importRunId: runId,
            contactLookup: (externalId) => peopleLookup.get(externalId) || null,
            prospectLookup: (externalId) => matterLookup.get(externalId) || null,
            userLookup: (externalId) => userLookup.get(externalId) || null,
            defaultUserId
          })

          if (!transformed) {
            // Skip - couldn't resolve entity
            result.errors.push({
              externalId: record.id,
              message: 'Could not resolve entity for note',
              type: 'TRANSFORM'
            })
            continue
          }

          const upsertResult = await upsert.upsertNote(transformed)

          result.processedCount++
          if (upsertResult.action === 'created') result.createdCount++
          else if (upsertResult.action === 'updated') result.updatedCount++
        } catch (error) {
          result.errors.push({
            externalId: record.id,
            message: error instanceof Error ? error.message : String(error),
            type: 'TRANSFORM'
          })
        }
      }
      break
    }

    case 'activities': {
      const peopleLookup = await getOrBuildPeopleLookup()
      const matterLookup = await getOrBuildMatterLookup()
      const userLookup = await getOrBuildUserLookup()

      const { useDrizzle, schema } = await import('../db')
      const db = useDrizzle()
      const defaultUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .limit(1)
        .get()
      const defaultUserId = defaultUser?.id || 'system'

      for (const record of records) {
        try {
          const transformed = transformers.transformActivity(record, {
            importRunId: runId,
            contactLookup: (externalId) => peopleLookup.get(externalId) || null,
            prospectLookup: (externalId) => matterLookup.get(externalId) || null,
            userLookup: (externalId) => userLookup.get(externalId) || null,
            defaultUserId
          })

          if (!transformed) {
            continue // Skip activities we can't transform
          }

          const upsertResult = await upsert.upsertActivity(transformed)

          result.processedCount++
          if (upsertResult.action === 'created') result.createdCount++
          else if (upsertResult.action === 'updated') result.updatedCount++
        } catch (error) {
          result.errors.push({
            externalId: record.id,
            message: error instanceof Error ? error.message : String(error),
            type: 'TRANSFORM'
          })
        }
      }
      break
    }
  }

  return result
}

// ===================================
// QUEUE HELPERS
// ===================================

async function queueNextPage(
  env: any,
  params: {
    runId: string
    phase: ImportPhase
    page: number
    perPage: number
    filter?: { updatedSince?: string }
  }
): Promise<void> {
  const queue = env.LAWMATICS_IMPORT_QUEUE

  if (!queue) {
    console.error('[Lawmatics Import] Queue not available')
    return
  }

  const message: ImportPageMessage = {
    type: 'IMPORT_PAGE',
    runId: params.runId,
    phase: params.phase,
    page: params.page,
    perPage: params.perPage,
    filter: params.filter
  }

  await queue.send(message)
  console.log(`[Lawmatics Import] Queued ${params.phase} page ${params.page}`)
}

async function queuePhaseComplete(
  env: any,
  params: { runId: string; phase: ImportPhase }
): Promise<void> {
  const queue = env.LAWMATICS_IMPORT_QUEUE

  if (!queue) {
    console.error('[Lawmatics Import] Queue not available')
    return
  }

  const message: PhaseCompleteMessage = {
    type: 'PHASE_COMPLETE',
    runId: params.runId,
    phase: params.phase
  }

  await queue.send(message)
  console.log(`[Lawmatics Import] Queued phase complete for ${params.phase}`)
}

// ===================================
// DATABASE HELPERS
// ===================================

async function updateRunStatus(
  runId: string,
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  errorMessage?: string
): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const updateData: Record<string, any> = {
    status,
    updatedAt: new Date()
  }

  if (status === 'COMPLETED') {
    updateData.completedAt = new Date()
  }

  if (errorMessage) {
    // Store error in checkpoint
    updateData.checkpoint = JSON.stringify({ error: errorMessage })
  }

  await db.update(schema.migrationRuns)
    .set(updateData)
    .where(eq(schema.migrationRuns.id, runId))
}

async function updateRunProgress(
  runId: string,
  progress: {
    processedEntities: number
    createdRecords: number
    updatedRecords: number
    errorCount: number
    checkpoint: { phase: string; page: number; timestamp: string }
  }
): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Increment counters
  await db.update(schema.migrationRuns)
    .set({
      processedEntities: sql`${schema.migrationRuns.processedEntities} + ${progress.processedEntities}`,
      createdRecords: sql`${schema.migrationRuns.createdRecords} + ${progress.createdRecords}`,
      updatedRecords: sql`${schema.migrationRuns.updatedRecords} + ${progress.updatedRecords}`,
      errorCount: sql`${schema.migrationRuns.errorCount} + ${progress.errorCount}`,
      checkpoint: JSON.stringify(progress.checkpoint),
      updatedAt: new Date()
    })
    .where(eq(schema.migrationRuns.id, runId))
}

async function logMigrationError(
  runId: string,
  error: {
    phase: string
    page?: number
    externalId?: string
    error: string
    errorType?: string
    stack?: string
  }
): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  await db.insert(schema.migrationErrors).values({
    id: nanoid(),
    runId,
    entityType: error.phase,
    externalId: error.externalId || null,
    errorType: (error.errorType as any) || 'API',
    errorMessage: error.error,
    errorDetails: JSON.stringify({
      page: error.page,
      stack: error.stack
    }),
    createdAt: new Date()
  })
}

async function updateIntegrationSyncTimestamps(
  integrationId: string
): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const now = new Date().toISOString()
  const timestamps: Record<ImportPhase, string> = {
    users: now,
    contacts: now,
    prospects: now,
    notes: now,
    activities: now
  }

  await db.update(schema.integrations)
    .set({
      lastSyncTimestamps: JSON.stringify(timestamps),
      updatedAt: new Date()
    })
    .where(eq(schema.integrations.id, integrationId))
}

// ===================================
// EXPORTED HELPERS FOR API ENDPOINTS
// ===================================

/**
 * Start a new migration run by queuing the first page
 */
export async function startMigrationRun(
  env: any,
  runId: string,
  phases: ImportPhase[],
  filter?: { updatedSince?: string }
): Promise<void> {
  if (phases.length === 0) {
    throw new Error('At least one phase must be specified')
  }

  // Start with the first configured phase
  const orderedPhases = PHASE_ORDER.filter(p => phases.includes(p))
  const firstPhase = orderedPhases[0]

  await queueNextPage(env, {
    runId,
    phase: firstPhase,
    page: 1,
    perPage: PAGE_SIZES[firstPhase],
    filter
  })

  console.log(`[Lawmatics Import] Started migration run ${runId} with phase ${firstPhase}`)
}
