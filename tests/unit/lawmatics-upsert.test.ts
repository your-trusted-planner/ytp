/**
 * Unit Tests for Lawmatics Upsert Logic
 *
 * Tests the upsert functions that handle inserting or updating
 * records during data import using in-memory SQLite database.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../../server/db/schema'
import { nanoid } from 'nanoid'
import {
  buildImportMetadata,
  serializeImportMetadata,
  type ImportMetadata
} from '../../server/utils/lawmatics-transformers'

// Create in-memory database for tests
let sqliteDb: Database.Database
let testDb: ReturnType<typeof drizzle<typeof schema>>

// Mock the server/db module
vi.mock('../../server/db', () => ({
  useDrizzle: () => testDb,
  schema
}))

// Now we can import the upsert functions (after mocking)
import {
  upsertUser,
  upsertClient,
  upsertMatter,
  upsertNote,
  upsertActivity,
  batchUpsertUsers,
  batchUpsertClients,
  batchUpsertMatters,
  batchUpsertNotes,
  batchUpsertActivities,
  buildUserLookupMap,
  buildClientLookupMap,
  buildMatterLookupMap,
  type UpsertResult,
  type BatchUpsertResult
} from '../../server/utils/lawmatics-upsert'

/**
 * Apply schema to SQLite database
 */
function applySchema(db: Database.Database): void {
  // Users table - match actual schema
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

  // Client profiles table - match actual schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      date_of_birth INTEGER,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      has_minor_children INTEGER NOT NULL DEFAULT 0,
      children_info TEXT,
      business_name TEXT,
      business_type TEXT,
      has_will INTEGER NOT NULL DEFAULT 0,
      has_trust INTEGER NOT NULL DEFAULT 0,
      last_updated INTEGER,
      assigned_lawyer_id TEXT REFERENCES users(id),
      referral_type TEXT,
      referred_by_user_id TEXT REFERENCES users(id),
      referred_by_partner_id TEXT,
      referral_notes TEXT,
      initial_attribution_source TEXT,
      initial_attribution_medium TEXT,
      initial_attribution_campaign TEXT,
      google_drive_folder_id TEXT,
      google_drive_folder_url TEXT,
      google_drive_sync_status TEXT DEFAULT 'NOT_SYNCED',
      google_drive_sync_error TEXT,
      google_drive_last_sync_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Matters table - match actual schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS matters (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      matter_number TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      lead_attorney_id TEXT REFERENCES users(id),
      engagement_journey_id TEXT,
      google_drive_folder_id TEXT,
      google_drive_folder_url TEXT,
      google_drive_sync_status TEXT DEFAULT 'NOT_SYNCED',
      google_drive_sync_error TEXT,
      google_drive_last_sync_at INTEGER,
      google_drive_subfolder_ids TEXT,
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Notes table - match actual schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Activities table - match actual schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_role TEXT,
      target_type TEXT,
      target_id TEXT,
      journey_id TEXT,
      journey_step_id TEXT,
      matter_id TEXT,
      service_id TEXT,
      attribution_source TEXT,
      attribution_medium TEXT,
      attribution_campaign TEXT,
      ip_address TEXT,
      user_agent TEXT,
      country TEXT,
      city TEXT,
      request_id TEXT,
      metadata TEXT,
      import_metadata TEXT,
      created_at INTEGER NOT NULL
    )
  `)
}

/**
 * Reset database between tests
 */
function resetDatabase(): void {
  if (sqliteDb) {
    const tables = sqliteDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]

    for (const { name } of tables) {
      sqliteDb.exec(`DELETE FROM "${name}"`)
    }
  }
}

/**
 * Create a test user for transformed data
 */
function createTransformedUser(overrides: Partial<{
  id: string
  email: string
  firstName: string
  lastName: string
  externalId: string
}> = {}) {
  const externalId = overrides.externalId || `lm-user-${nanoid(8)}`
  const metadata = buildImportMetadata(externalId)

  return {
    id: overrides.id || nanoid(),
    email: overrides.email || `${externalId}@test.com`,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    phone: null,
    role: 'LAWYER' as const,
    adminLevel: 0,
    status: 'INACTIVE' as const,
    importMetadata: serializeImportMetadata(metadata),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Create a test client for transformed data
 */
function createTransformedClient(overrides: Partial<{
  userId: string
  email: string
  firstName: string
  lastName: string
  externalId: string
  includeProfile: boolean
}> = {}) {
  const externalId = overrides.externalId || `lm-contact-${nanoid(8)}`
  const userId = overrides.userId || nanoid()
  const metadata = buildImportMetadata(externalId)

  const user = {
    id: userId,
    email: overrides.email || `${externalId}@test.com`,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'Client',
    phone: null,
    role: 'CLIENT' as const,
    status: 'INACTIVE' as const,
    importMetadata: serializeImportMetadata(metadata),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const profile = overrides.includeProfile !== false ? {
    id: nanoid(),
    userId,
    dateOfBirth: new Date('1980-01-15'),
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '90210',
    createdAt: new Date(),
    updatedAt: new Date()
  } : null

  return { user, profile, flags: [] as any[] }
}

/**
 * Create a test matter for transformed data
 */
function createTransformedMatter(clientId: string, overrides: Partial<{
  id: string
  title: string
  externalId: string
}> = {}) {
  const externalId = overrides.externalId || `lm-prospect-${nanoid(8)}`
  const metadata = buildImportMetadata(externalId)

  return {
    id: overrides.id || nanoid(),
    clientId,
    title: overrides.title || 'Test Matter',
    matterNumber: 'EP-2024-001',
    description: 'Test matter description',
    status: 'OPEN' as const,
    leadAttorneyId: null,
    importMetadata: serializeImportMetadata(metadata),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Create a test note for transformed data
 */
function createTransformedNote(entityId: string, createdById: string, overrides: Partial<{
  id: string
  content: string
  entityType: string
  externalId: string
}> = {}) {
  const externalId = overrides.externalId || `lm-note-${nanoid(8)}`
  const metadata = buildImportMetadata(externalId)

  return {
    id: overrides.id || nanoid(),
    content: overrides.content || 'Test note content',
    entityType: overrides.entityType || 'client',
    entityId,
    createdBy: createdById,
    importMetadata: serializeImportMetadata(metadata),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Create a test activity for transformed data
 */
function createTransformedActivity(userId: string, overrides: Partial<{
  id: string
  type: string
  description: string
  targetId: string
  targetType: string
  externalId: string
}> = {}) {
  const externalId = overrides.externalId || `lm-activity-${nanoid(8)}`
  const metadata = buildImportMetadata(externalId)

  return {
    id: overrides.id || nanoid(),
    type: overrides.type || 'EMAIL_SENT',
    description: overrides.description || 'Test activity',
    userId,
    userRole: 'LAWYER',
    targetType: overrides.targetType || 'client',
    targetId: overrides.targetId || null,
    metadata: null,
    importMetadata: serializeImportMetadata(metadata),
    createdAt: new Date()
  }
}

// Setup database before each test
beforeEach(() => {
  // Create fresh in-memory database
  sqliteDb = new Database(':memory:')
  testDb = drizzle(sqliteDb, { schema })
  applySchema(sqliteDb)
})

// Clean up after all tests
afterAll(() => {
  if (sqliteDb) {
    sqliteDb.close()
  }
})

// ===================================
// USER UPSERT TESTS
// ===================================

describe('upsertUser', () => {
  it('creates a new user when not exists', async () => {
    const user = createTransformedUser()

    const result = await upsertUser(user)

    expect(result.action).toBe('created')
    expect(result.id).toBe(user.id)

    // Verify in database
    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id)).get()
    expect(dbUser).toBeDefined()
    expect(dbUser?.email).toBe(user.email)
    expect(dbUser?.firstName).toBe(user.firstName)
  })

  it('updates an existing user when found by externalId', async () => {
    const externalId = 'lm-user-existing'
    const originalUser = createTransformedUser({ externalId })

    // Insert original
    await upsertUser(originalUser)

    // Create updated version with same externalId but different data
    const updatedUser = createTransformedUser({
      externalId,
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@test.com'
    })

    const result = await upsertUser(updatedUser)

    expect(result.action).toBe('updated')
    expect(result.id).toBe(originalUser.id) // Should use original ID

    // Verify updates
    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, originalUser.id)).get()
    expect(dbUser?.firstName).toBe('Updated')
    expect(dbUser?.lastName).toBe('Name')
  })

  it('does not update role or adminLevel on existing user', async () => {
    const externalId = 'lm-user-admin'
    const originalUser = createTransformedUser({ externalId })

    // Insert original
    await upsertUser(originalUser)

    // Manually change role to ADMIN
    await testDb.update(schema.users)
      .set({ role: 'ADMIN', adminLevel: 3 })
      .where(eq(schema.users.id, originalUser.id))

    // Try to update - should not change role
    const updatedUser = createTransformedUser({ externalId })
    await upsertUser(updatedUser)

    // Verify role is preserved
    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, originalUser.id)).get()
    expect(dbUser?.role).toBe('ADMIN')
    expect(dbUser?.adminLevel).toBe(3)
  })

  it('updates lastSyncedAt timestamp on update', async () => {
    const externalId = 'lm-user-sync'
    const originalUser = createTransformedUser({ externalId })

    await upsertUser(originalUser)

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    const updatedUser = createTransformedUser({ externalId })
    await upsertUser(updatedUser)

    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, originalUser.id)).get()
    const metadata = JSON.parse(dbUser!.importMetadata!) as ImportMetadata

    expect(metadata.lastSyncedAt).toBeDefined()
  })
})

describe('batchUpsertUsers', () => {
  it('processes multiple users', async () => {
    const users = [
      createTransformedUser({ externalId: 'lm-user-1' }),
      createTransformedUser({ externalId: 'lm-user-2' }),
      createTransformedUser({ externalId: 'lm-user-3' })
    ]

    const result = await batchUpsertUsers(users)

    expect(result.created).toBe(3)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(result.results).toHaveLength(3)
  })

  it('handles mix of creates and updates', async () => {
    // Insert first user
    const existingUser = createTransformedUser({ externalId: 'lm-user-existing' })
    await upsertUser(existingUser)

    // Batch with existing and new
    const users = [
      createTransformedUser({ externalId: 'lm-user-existing', firstName: 'Updated' }),
      createTransformedUser({ externalId: 'lm-user-new' })
    ]

    const result = await batchUpsertUsers(users)

    expect(result.created).toBe(1)
    expect(result.updated).toBe(1)
  })

  it('captures errors without stopping batch', async () => {
    // Create a user with duplicate email to cause a constraint error
    const user1 = createTransformedUser({ externalId: 'lm-user-1', email: 'duplicate@test.com' })
    await upsertUser(user1)

    // Reset database state but don't clear users - so we can have a real duplicate
    // Instead, create another user that will fail due to duplicate email
    const user2 = {
      ...createTransformedUser({ externalId: 'lm-user-2' }),
      email: 'duplicate@test.com' // Same email as user1 - will cause constraint error
    }
    const user3 = createTransformedUser({ externalId: 'lm-user-3', email: 'unique@test.com' })

    const result = await batchUpsertUsers([user2, user3])

    // Should have 1 created, 1 error
    expect(result.created).toBe(1)
    expect(result.errors.length).toBe(1)
  })
})

// ===================================
// CLIENT UPSERT TESTS
// ===================================

describe('upsertClient', () => {
  it('creates client with profile', async () => {
    const client = createTransformedClient({ includeProfile: true })

    const result = await upsertClient(client)

    expect(result.action).toBe('created')
    expect(result.id).toBe(client.user.id)

    // Verify user
    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, client.user.id)).get()
    expect(dbUser).toBeDefined()
    expect(dbUser?.role).toBe('CLIENT')

    // Verify profile
    const dbProfile = await testDb.select().from(schema.clientProfiles).where(eq(schema.clientProfiles.userId, client.user.id)).get()
    expect(dbProfile).toBeDefined()
    expect(dbProfile?.address).toBe('123 Main St')
  })

  it('creates client without profile', async () => {
    const client = createTransformedClient({ includeProfile: false })

    const result = await upsertClient(client)

    expect(result.action).toBe('created')

    // Verify no profile
    const dbProfile = await testDb.select().from(schema.clientProfiles).where(eq(schema.clientProfiles.userId, client.user.id)).get()
    expect(dbProfile).toBeUndefined()
  })

  it('updates existing client and profile', async () => {
    const externalId = 'lm-contact-existing'
    const originalClient = createTransformedClient({ externalId })

    await upsertClient(originalClient)

    // Update with new data
    const updatedClient = createTransformedClient({
      externalId,
      firstName: 'Updated',
      lastName: 'Client'
    })

    const result = await upsertClient(updatedClient)

    expect(result.action).toBe('updated')

    // Verify user update
    const dbUser = await testDb.select().from(schema.users).where(eq(schema.users.id, originalClient.user.id)).get()
    expect(dbUser?.firstName).toBe('Updated')
  })

  it('creates profile for existing client without profile', async () => {
    const externalId = 'lm-contact-no-profile'
    const clientWithoutProfile = createTransformedClient({ externalId, includeProfile: false })

    await upsertClient(clientWithoutProfile)

    // Update with profile
    const clientWithProfile = createTransformedClient({ externalId, includeProfile: true })
    await upsertClient(clientWithProfile)

    // Verify profile was created
    const dbProfile = await testDb.select().from(schema.clientProfiles).where(eq(schema.clientProfiles.userId, clientWithoutProfile.user.id)).get()
    expect(dbProfile).toBeDefined()
  })
})

describe('batchUpsertClients', () => {
  it('processes multiple clients', async () => {
    const clients = [
      createTransformedClient({ externalId: 'lm-contact-1' }),
      createTransformedClient({ externalId: 'lm-contact-2' })
    ]

    const result = await batchUpsertClients(clients)

    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(0)
  })
})

// ===================================
// MATTER UPSERT TESTS
// ===================================

describe('upsertMatter', () => {
  it('creates a new matter', async () => {
    // Create a client first
    const client = createTransformedClient()
    await upsertClient(client)

    const matter = createTransformedMatter(client.user.id)

    const result = await upsertMatter(matter)

    expect(result.action).toBe('created')
    expect(result.id).toBe(matter.id)

    // Verify in database
    const dbMatter = await testDb.select().from(schema.matters).where(eq(schema.matters.id, matter.id)).get()
    expect(dbMatter).toBeDefined()
    expect(dbMatter?.title).toBe('Test Matter')
    expect(dbMatter?.clientId).toBe(client.user.id)
  })

  it('updates existing matter', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const externalId = 'lm-prospect-existing'
    const originalMatter = createTransformedMatter(client.user.id, { externalId })

    await upsertMatter(originalMatter)

    // Update
    const updatedMatter = createTransformedMatter(client.user.id, {
      externalId,
      title: 'Updated Matter Title'
    })

    const result = await upsertMatter(updatedMatter)

    expect(result.action).toBe('updated')

    const dbMatter = await testDb.select().from(schema.matters).where(eq(schema.matters.id, originalMatter.id)).get()
    expect(dbMatter?.title).toBe('Updated Matter Title')
  })
})

describe('batchUpsertMatters', () => {
  it('processes multiple matters', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const matters = [
      createTransformedMatter(client.user.id, { externalId: 'lm-prospect-1' }),
      createTransformedMatter(client.user.id, { externalId: 'lm-prospect-2' })
    ]

    const result = await batchUpsertMatters(matters)

    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(0)
  })
})

// ===================================
// NOTE UPSERT TESTS
// ===================================

describe('upsertNote', () => {
  it('creates a new note', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const user = createTransformedUser()
    await upsertUser(user)

    const note = createTransformedNote(client.user.id, user.id)

    const result = await upsertNote(note)

    expect(result.action).toBe('created')

    const dbNote = await testDb.select().from(schema.notes).where(eq(schema.notes.id, note.id)).get()
    expect(dbNote).toBeDefined()
    expect(dbNote?.content).toBe('Test note content')
    expect(dbNote?.entityId).toBe(client.user.id)
  })

  it('updates existing note', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const user = createTransformedUser()
    await upsertUser(user)

    const externalId = 'lm-note-existing'
    const originalNote = createTransformedNote(client.user.id, user.id, { externalId })

    await upsertNote(originalNote)

    // Update
    const updatedNote = createTransformedNote(client.user.id, user.id, {
      externalId,
      content: 'Updated note content'
    })

    const result = await upsertNote(updatedNote)

    expect(result.action).toBe('updated')

    const dbNote = await testDb.select().from(schema.notes).where(eq(schema.notes.id, originalNote.id)).get()
    expect(dbNote?.content).toBe('Updated note content')
  })
})

describe('batchUpsertNotes', () => {
  it('processes multiple notes', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const user = createTransformedUser()
    await upsertUser(user)

    const notes = [
      createTransformedNote(client.user.id, user.id, { externalId: 'lm-note-1' }),
      createTransformedNote(client.user.id, user.id, { externalId: 'lm-note-2' })
    ]

    const result = await batchUpsertNotes(notes)

    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(0)
  })
})

// ===================================
// ACTIVITY UPSERT TESTS
// ===================================

describe('upsertActivity', () => {
  it('creates a new activity', async () => {
    const user = createTransformedUser()
    await upsertUser(user)

    const activity = createTransformedActivity(user.id)

    const result = await upsertActivity(activity)

    expect(result.action).toBe('created')

    const dbActivity = await testDb.select().from(schema.activities).where(eq(schema.activities.id, activity.id)).get()
    expect(dbActivity).toBeDefined()
    expect(dbActivity?.type).toBe('EMAIL_SENT')
  })

  it('updates existing activity (immutable except metadata)', async () => {
    const user = createTransformedUser()
    await upsertUser(user)

    const externalId = 'lm-activity-existing'
    const originalActivity = createTransformedActivity(user.id, { externalId })

    await upsertActivity(originalActivity)

    // Update attempt
    const updatedActivity = createTransformedActivity(user.id, {
      externalId,
      description: 'Updated description'
    })

    const result = await upsertActivity(updatedActivity)

    expect(result.action).toBe('updated')

    // Description should NOT change (activities are immutable)
    const dbActivity = await testDb.select().from(schema.activities).where(eq(schema.activities.id, originalActivity.id)).get()
    expect(dbActivity?.description).toBe('Test activity')
  })
})

describe('batchUpsertActivities', () => {
  it('processes multiple activities', async () => {
    const user = createTransformedUser()
    await upsertUser(user)

    const activities = [
      createTransformedActivity(user.id, { externalId: 'lm-activity-1' }),
      createTransformedActivity(user.id, { externalId: 'lm-activity-2' })
    ]

    const result = await batchUpsertActivities(activities)

    expect(result.created).toBe(2)
    expect(result.errors).toHaveLength(0)
  })
})

// ===================================
// LOOKUP MAP TESTS
// ===================================

describe('buildUserLookupMap', () => {
  it('builds map of externalId to internalId', async () => {
    const users = [
      createTransformedUser({ externalId: 'lm-user-1' }),
      createTransformedUser({ externalId: 'lm-user-2' })
    ]

    await batchUpsertUsers(users)

    const map = await buildUserLookupMap()

    expect(map.size).toBe(2)
    expect(map.get('lm-user-1')).toBe(users[0].id)
    expect(map.get('lm-user-2')).toBe(users[1].id)
  })

  it('only includes users from specified source', async () => {
    const lawmaticsUser = createTransformedUser({ externalId: 'lm-user-1' })
    await upsertUser(lawmaticsUser)

    // Create user from different source
    const otherUser = {
      ...createTransformedUser(),
      importMetadata: JSON.stringify({
        source: 'WEALTHCOUNSEL',
        externalId: 'wc-user-1',
        importedAt: new Date().toISOString()
      })
    }
    await upsertUser(otherUser)

    const map = await buildUserLookupMap('LAWMATICS')

    expect(map.size).toBe(1)
    expect(map.has('lm-user-1')).toBe(true)
    expect(map.has('wc-user-1')).toBe(false)
  })
})

describe('buildClientLookupMap', () => {
  it('builds map for clients only', async () => {
    const client = createTransformedClient({ externalId: 'lm-contact-1' })
    await upsertClient(client)

    const user = createTransformedUser({ externalId: 'lm-user-1' })
    await upsertUser(user)

    const map = await buildClientLookupMap()

    expect(map.size).toBe(1)
    expect(map.get('lm-contact-1')).toBe(client.user.id)
    expect(map.has('lm-user-1')).toBe(false) // Should not include non-clients
  })
})

describe('buildMatterLookupMap', () => {
  it('builds map of externalId to internalId for matters', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const matters = [
      createTransformedMatter(client.user.id, { externalId: 'lm-prospect-1' }),
      createTransformedMatter(client.user.id, { externalId: 'lm-prospect-2' })
    ]

    await batchUpsertMatters(matters)

    const map = await buildMatterLookupMap()

    expect(map.size).toBe(2)
    expect(map.get('lm-prospect-1')).toBe(matters[0].id)
    expect(map.get('lm-prospect-2')).toBe(matters[1].id)
  })
})

// ===================================
// EDGE CASE TESTS
// ===================================

describe('Edge Cases', () => {
  it('handles concurrent upserts of same record', async () => {
    const externalId = 'lm-user-concurrent'
    const user1 = createTransformedUser({ externalId, firstName: 'Version1' })
    const user2 = createTransformedUser({ externalId, firstName: 'Version2' })

    // First upsert
    const result1 = await upsertUser(user1)
    expect(result1.action).toBe('created')

    // Second upsert with same externalId
    const result2 = await upsertUser(user2)
    expect(result2.action).toBe('updated')

    // Should have same internal ID
    expect(result1.id).toBe(result2.id)
  })

  it('handles empty batch gracefully', async () => {
    const result = await batchUpsertUsers([])

    expect(result.created).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles unicode content in notes', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const user = createTransformedUser()
    await upsertUser(user)

    const note = createTransformedNote(client.user.id, user.id, {
      content: '中文内容 with émojis 🎉 and special chars <>&'
    })

    const result = await upsertNote(note)
    expect(result.action).toBe('created')

    const dbNote = await testDb.select().from(schema.notes).where(eq(schema.notes.id, note.id)).get()
    expect(dbNote?.content).toBe('中文内容 with émojis 🎉 and special chars <>&')
  })

  it('handles very long text content', async () => {
    const client = createTransformedClient()
    await upsertClient(client)

    const user = createTransformedUser()
    await upsertUser(user)

    const longContent = 'A'.repeat(10000)
    const note = createTransformedNote(client.user.id, user.id, { content: longContent })

    const result = await upsertNote(note)
    expect(result.action).toBe('created')

    const dbNote = await testDb.select().from(schema.notes).where(eq(schema.notes.id, note.id)).get()
    expect(dbNote?.content.length).toBe(10000)
  })
})
