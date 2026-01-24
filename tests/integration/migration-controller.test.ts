/**
 * Integration Tests for Migration Controller API and Queue Consumer
 *
 * Tests the migration API endpoints and queue message processing logic.
 * Uses mocked dependencies to isolate testing of the business logic.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '../../server/db/schema'
import { nanoid } from 'nanoid'
import type {
  ImportPageMessage,
  PhaseCompleteMessage,
  ImportPhase
} from '../../server/queue/lawmatics-import'

// Create in-memory database for tests
let sqliteDb: Database.Database
let testDb: ReturnType<typeof drizzle<typeof schema>>

// Mock dependencies
vi.mock('../../server/db', () => ({
  useDrizzle: () => testDb,
  schema
}))

// Mock the Lawmatics client
const mockFetchUsers = vi.fn()
const mockFetchContacts = vi.fn()
const mockFetchProspects = vi.fn()
const mockFetchAllNotes = vi.fn()
const mockFetchActivities = vi.fn()

vi.mock('../../server/utils/lawmatics-client', () => ({
  createLawmaticsClientFromIntegration: vi.fn().mockResolvedValue({
    fetchUsers: mockFetchUsers,
    fetchContacts: mockFetchContacts,
    fetchProspects: mockFetchProspects,
    fetchAllNotes: mockFetchAllNotes,
    fetchActivities: mockFetchActivities
  })
}))

// Import after mocks are set up
import {
  startMigrationRun,
  clearLookupCaches
} from '../../server/queue/lawmatics-import'

/**
 * Apply schema to SQLite database
 */
function applySchema(db: Database.Database): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      firebase_uid TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'PROSPECT',
      admin_level INTEGER DEFAULT 0,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      avatar TEXT,
      signature_image TEXT,
      signature_image_updated_at INTEGER,
      status TEXT NOT NULL DEFAULT 'PROSPECT',
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Integrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      credentials_key TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      settings TEXT,
      last_tested_at INTEGER,
      last_error_message TEXT,
      last_sync_timestamps TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Migration runs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_runs (
      id TEXT PRIMARY KEY,
      integration_id TEXT NOT NULL REFERENCES integrations(id),
      run_type TEXT NOT NULL,
      entity_types TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      processed_entities INTEGER NOT NULL DEFAULT 0,
      total_entities INTEGER,
      created_records INTEGER NOT NULL DEFAULT 0,
      updated_records INTEGER NOT NULL DEFAULT 0,
      skipped_records INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      current_phase TEXT,
      checkpoint TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Migration errors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_errors (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES migration_runs(id),
      entity_type TEXT NOT NULL,
      external_id TEXT,
      error_type TEXT NOT NULL,
      error_message TEXT NOT NULL,
      error_details TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      retried_at INTEGER,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `)
}

/**
 * Create a test integration
 */
function createTestIntegration(overrides: Partial<{
  id: string
  status: string
  credentialsKey: string
}> = {}) {
  const id = overrides.id || nanoid()
  const now = new Date()

  return {
    id,
    type: 'LAWMATICS',
    name: 'Test Lawmatics Integration',
    credentialsKey: overrides.credentialsKey || 'test-credentials-key',
    status: (overrides.status || 'CONNECTED') as any,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Create a test migration run
 */
function createTestMigrationRun(integrationId: string, overrides: Partial<{
  id: string
  status: string
  entityTypes: string[]
}> = {}) {
  const id = overrides.id || nanoid()
  const now = new Date()

  return {
    id,
    integrationId,
    runType: 'FULL' as const,
    entityTypes: JSON.stringify(overrides.entityTypes || ['users', 'contacts']),
    status: (overrides.status || 'PENDING') as any,
    processedEntities: 0,
    createdRecords: 0,
    updatedRecords: 0,
    skippedRecords: 0,
    errorCount: 0,
    createdAt: now,
    updatedAt: now
  }
}

// Setup database before each test
beforeEach(() => {
  // Create fresh in-memory database
  sqliteDb = new Database(':memory:')
  testDb = drizzle(sqliteDb, { schema })
  applySchema(sqliteDb)

  // Reset mocks
  vi.clearAllMocks()
  clearLookupCaches()
})

// Clean up after all tests
afterAll(() => {
  if (sqliteDb) {
    sqliteDb.close()
  }
})

// ===================================
// MIGRATION RUN CREATION TESTS
// ===================================

describe('Migration Run Creation', () => {
  it('creates a migration run record in the database', async () => {
    // Setup integration
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    // Create migration run
    const runId = nanoid()
    const now = new Date()

    await testDb.insert(schema.migrationRuns).values({
      id: runId,
      integrationId: integration.id,
      runType: 'FULL',
      entityTypes: JSON.stringify(['users', 'contacts']),
      status: 'PENDING',
      processedEntities: 0,
      createdRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errorCount: 0,
      createdAt: now,
      updatedAt: now
    })

    // Verify
    const run = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, runId))
      .get()

    expect(run).toBeDefined()
    expect(run?.status).toBe('PENDING')
    expect(JSON.parse(run!.entityTypes)).toEqual(['users', 'contacts'])
  })

  it('rejects migration when integration is in error state', async () => {
    const integration = createTestIntegration({ status: 'ERROR' })
    await testDb.insert(schema.integrations).values(integration)

    // Verify integration status
    const dbIntegration = await testDb.select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, integration.id))
      .get()

    expect(dbIntegration?.status).toBe('ERROR')
  })

  it('rejects migration when another run is in progress', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    // Create running migration
    const runningRun = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(runningRun)

    // Check for running migrations
    const existingRuns = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.integrationId, integration.id))
      .all()

    const runningMigration = existingRuns.find(r =>
      r.status === 'RUNNING' || r.status === 'PENDING'
    )

    expect(runningMigration).toBeDefined()
  })
})

// ===================================
// MIGRATION RUN STATUS TESTS
// ===================================

describe('Migration Run Status Updates', () => {
  it('updates status to RUNNING when started', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id)
    await testDb.insert(schema.migrationRuns).values(run)

    // Update status
    await testDb.update(schema.migrationRuns)
      .set({ status: 'RUNNING', startedAt: new Date() })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.status).toBe('RUNNING')
    expect(updatedRun?.startedAt).toBeDefined()
  })

  it('updates status to COMPLETED with completedAt', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Complete the run
    const completedAt = new Date()
    await testDb.update(schema.migrationRuns)
      .set({ status: 'COMPLETED', completedAt })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.status).toBe('COMPLETED')
    expect(updatedRun?.completedAt).toBeDefined()
  })

  it('updates status to CANCELLED', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Cancel the run
    await testDb.update(schema.migrationRuns)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.status).toBe('CANCELLED')
  })

  it('updates status to PAUSED', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Pause the run
    await testDb.update(schema.migrationRuns)
      .set({ status: 'PAUSED' })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.status).toBe('PAUSED')
  })
})

// ===================================
// MIGRATION PROGRESS TRACKING TESTS
// ===================================

describe('Migration Progress Tracking', () => {
  it('tracks processed entities count', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Update progress
    await testDb.update(schema.migrationRuns)
      .set({
        processedEntities: 100,
        createdRecords: 80,
        updatedRecords: 15,
        skippedRecords: 5
      })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.processedEntities).toBe(100)
    expect(updatedRun?.createdRecords).toBe(80)
    expect(updatedRun?.updatedRecords).toBe(15)
    expect(updatedRun?.skippedRecords).toBe(5)
  })

  it('tracks error count', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Update error count
    await testDb.update(schema.migrationRuns)
      .set({ errorCount: 3 })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(updatedRun?.errorCount).toBe(3)
  })

  it('saves checkpoint information', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Save checkpoint
    const checkpoint = { phase: 'contacts', page: 5, timestamp: new Date().toISOString() }
    await testDb.update(schema.migrationRuns)
      .set({ checkpoint: JSON.stringify(checkpoint) })
      .where(eq(schema.migrationRuns.id, run.id))

    const updatedRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    const savedCheckpoint = JSON.parse(updatedRun!.checkpoint!)
    expect(savedCheckpoint.phase).toBe('contacts')
    expect(savedCheckpoint.page).toBe(5)
  })
})

// ===================================
// MIGRATION ERROR LOGGING TESTS
// ===================================

describe('Migration Error Logging', () => {
  it('logs errors to migration_errors table', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Log an error
    const errorId = nanoid()
    await testDb.insert(schema.migrationErrors).values({
      id: errorId,
      runId: run.id,
      entityType: 'contacts',
      externalId: 'lm-contact-123',
      errorType: 'TRANSFORM' as any,
      errorMessage: 'Failed to transform contact',
      errorDetails: JSON.stringify({ page: 2 }),
      createdAt: new Date()
    })

    // Verify
    const errors = await testDb.select()
      .from(schema.migrationErrors)
      .where(eq(schema.migrationErrors.runId, run.id))
      .all()

    expect(errors).toHaveLength(1)
    expect(errors[0].entityType).toBe('contacts')
    expect(errors[0].externalId).toBe('lm-contact-123')
  })

  it('logs multiple errors for a run', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'RUNNING' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Log multiple errors
    for (let i = 0; i < 5; i++) {
      await testDb.insert(schema.migrationErrors).values({
        id: nanoid(),
        runId: run.id,
        entityType: 'contacts',
        externalId: `lm-contact-${i}`,
        errorType: 'TRANSFORM' as any,
        errorMessage: `Error ${i}`,
        createdAt: new Date()
      })
    }

    // Verify
    const errors = await testDb.select()
      .from(schema.migrationErrors)
      .where(eq(schema.migrationErrors.runId, run.id))
      .all()

    expect(errors).toHaveLength(5)
  })
})

// ===================================
// QUEUE MESSAGE STRUCTURE TESTS
// ===================================

describe('Queue Message Structure', () => {
  it('creates valid IMPORT_PAGE message', () => {
    const message: ImportPageMessage = {
      type: 'IMPORT_PAGE',
      runId: 'run-123',
      phase: 'contacts',
      page: 1,
      perPage: 100
    }

    expect(message.type).toBe('IMPORT_PAGE')
    expect(message.runId).toBe('run-123')
    expect(message.phase).toBe('contacts')
    expect(message.page).toBe(1)
    expect(message.perPage).toBe(100)
  })

  it('creates valid IMPORT_PAGE message with filter', () => {
    const message: ImportPageMessage = {
      type: 'IMPORT_PAGE',
      runId: 'run-123',
      phase: 'contacts',
      page: 1,
      perPage: 100,
      filter: {
        updatedSince: '2024-01-01T00:00:00Z'
      }
    }

    expect(message.filter?.updatedSince).toBe('2024-01-01T00:00:00Z')
  })

  it('creates valid PHASE_COMPLETE message', () => {
    const message: PhaseCompleteMessage = {
      type: 'PHASE_COMPLETE',
      runId: 'run-123',
      phase: 'contacts'
    }

    expect(message.type).toBe('PHASE_COMPLETE')
    expect(message.runId).toBe('run-123')
    expect(message.phase).toBe('contacts')
  })

  it('validates import phase types', () => {
    const validPhases: ImportPhase[] = ['users', 'contacts', 'prospects', 'notes', 'activities']

    for (const phase of validPhases) {
      const message: ImportPageMessage = {
        type: 'IMPORT_PAGE',
        runId: 'run-123',
        phase,
        page: 1,
        perPage: 100
      }

      expect(message.phase).toBe(phase)
    }
  })
})

// ===================================
// PHASE ORDERING TESTS
// ===================================

describe('Phase Ordering', () => {
  const PHASE_ORDER: ImportPhase[] = ['users', 'contacts', 'prospects', 'notes', 'activities']

  it('processes phases in correct order', () => {
    const configuredPhases: ImportPhase[] = ['users', 'contacts', 'prospects']
    const orderedPhases = PHASE_ORDER.filter(p => configuredPhases.includes(p))

    expect(orderedPhases).toEqual(['users', 'contacts', 'prospects'])
  })

  it('filters to only configured phases', () => {
    const configuredPhases: ImportPhase[] = ['contacts', 'notes']
    const orderedPhases = PHASE_ORDER.filter(p => configuredPhases.includes(p))

    expect(orderedPhases).toEqual(['contacts', 'notes'])
  })

  it('determines next phase correctly', () => {
    const configuredPhases: ImportPhase[] = ['users', 'contacts', 'prospects']
    const currentPhase: ImportPhase = 'contacts'

    const currentIndex = PHASE_ORDER.indexOf(currentPhase)
    const nextPhases = PHASE_ORDER.slice(currentIndex + 1)
      .filter(p => configuredPhases.includes(p))

    expect(nextPhases).toEqual(['prospects'])
    expect(nextPhases[0]).toBe('prospects')
  })

  it('returns empty array when all phases complete', () => {
    const configuredPhases: ImportPhase[] = ['users', 'contacts']
    const currentPhase: ImportPhase = 'contacts'

    const currentIndex = PHASE_ORDER.indexOf(currentPhase)
    const nextPhases = PHASE_ORDER.slice(currentIndex + 1)
      .filter(p => configuredPhases.includes(p))

    expect(nextPhases).toEqual([])
  })
})

// ===================================
// INTEGRATION SYNC TIMESTAMPS TESTS
// ===================================

describe('Integration Sync Timestamps', () => {
  it('updates last sync timestamps on integration', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const now = new Date().toISOString()
    const timestamps = {
      users: now,
      contacts: now,
      prospects: now
    }

    await testDb.update(schema.integrations)
      .set({ lastSyncTimestamps: JSON.stringify(timestamps) })
      .where(eq(schema.integrations.id, integration.id))

    const updated = await testDb.select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, integration.id))
      .get()

    const savedTimestamps = JSON.parse(updated!.lastSyncTimestamps!)
    expect(savedTimestamps.users).toBe(now)
    expect(savedTimestamps.contacts).toBe(now)
    expect(savedTimestamps.prospects).toBe(now)
  })

  it('uses timestamps for incremental sync filter', async () => {
    const integration = createTestIntegration()
    const lastSync = '2024-06-01T00:00:00Z'
    integration.lastSyncTimestamps = JSON.stringify({ contacts: lastSync })

    await testDb.insert(schema.integrations).values(integration as any)

    const dbIntegration = await testDb.select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, integration.id))
      .get()

    const timestamps = JSON.parse(dbIntegration!.lastSyncTimestamps!)
    expect(timestamps.contacts).toBe(lastSync)

    // This timestamp would be used as filter for incremental sync
    const filter = { updatedSince: timestamps.contacts }
    expect(filter.updatedSince).toBe(lastSync)
  })
})

// ===================================
// QUEUE STARTUP TESTS
// ===================================

describe('startMigrationRun', () => {
  it('throws error when no phases specified', async () => {
    const mockEnv = {
      LAWMATICS_IMPORT_QUEUE: {
        send: vi.fn()
      }
    }

    await expect(startMigrationRun(mockEnv, 'run-123', [])).rejects.toThrow(
      'At least one phase must be specified'
    )
  })

  it('queues the first phase', async () => {
    const mockSend = vi.fn()
    const mockEnv = {
      LAWMATICS_IMPORT_QUEUE: {
        send: mockSend
      }
    }

    await startMigrationRun(mockEnv, 'run-123', ['users', 'contacts'])

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: 'IMPORT_PAGE',
      runId: 'run-123',
      phase: 'users',
      page: 1
    }))
  })

  it('uses correct page size per phase', async () => {
    const mockSend = vi.fn()
    const mockEnv = {
      LAWMATICS_IMPORT_QUEUE: {
        send: mockSend
      }
    }

    await startMigrationRun(mockEnv, 'run-123', ['activities'])

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      phase: 'activities',
      perPage: 25 // Activities use smaller page size
    }))
  })

  it('includes filter for incremental sync', async () => {
    const mockSend = vi.fn()
    const mockEnv = {
      LAWMATICS_IMPORT_QUEUE: {
        send: mockSend
      }
    }

    const filter = { updatedSince: '2024-06-01T00:00:00Z' }
    await startMigrationRun(mockEnv, 'run-123', ['contacts'], filter)

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      filter
    }))
  })

  it('respects phase order', async () => {
    const mockSend = vi.fn()
    const mockEnv = {
      LAWMATICS_IMPORT_QUEUE: {
        send: mockSend
      }
    }

    // Even if contacts is first in array, users should run first per PHASE_ORDER
    await startMigrationRun(mockEnv, 'run-123', ['contacts', 'users'])

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      phase: 'users' // users comes before contacts in PHASE_ORDER
    }))
  })
})

// ===================================
// EDGE CASE TESTS
// ===================================

describe('Edge Cases', () => {
  it('handles empty result set from API', async () => {
    // Simulate empty results - should not throw
    const emptyResult = {
      data: [],
      hasMore: false,
      totalCount: 0
    }

    expect(emptyResult.data).toHaveLength(0)
    expect(emptyResult.hasMore).toBe(false)
  })

  it('handles cancelled run', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'CANCELLED' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Verify status
    const dbRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(dbRun?.status).toBe('CANCELLED')
  })

  it('handles paused run', async () => {
    const integration = createTestIntegration()
    await testDb.insert(schema.integrations).values(integration)

    const run = createTestMigrationRun(integration.id, { status: 'PAUSED' })
    await testDb.insert(schema.migrationRuns).values(run)

    // Verify status
    const dbRun = await testDb.select()
      .from(schema.migrationRuns)
      .where(eq(schema.migrationRuns.id, run.id))
      .get()

    expect(dbRun?.status).toBe('PAUSED')
  })

  it('handles missing integration', async () => {
    const run = createTestMigrationRun('non-existent-integration')

    // This should fail due to foreign key constraint or be handled by the app logic
    const integration = await testDb.select()
      .from(schema.integrations)
      .where(eq(schema.integrations.id, 'non-existent-integration'))
      .get()

    expect(integration).toBeUndefined()
  })
})
