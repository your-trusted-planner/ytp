/**
 * Test Database Utilities
 *
 * Provides in-memory SQLite database for unit and integration tests.
 * Uses better-sqlite3 for synchronous operations in tests.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from '../../server/db/schema'
import { nanoid } from 'nanoid'

// Type for the test database instance
type TestDatabase = ReturnType<typeof drizzle<typeof schema>>

// Global test database instance
let testDb: TestDatabase | null = null
let sqliteDb: Database.Database | null = null

/**
 * Create a fresh in-memory test database with schema applied
 */
export function createTestDatabase(): TestDatabase {
  // Create in-memory SQLite database
  sqliteDb = new Database(':memory:')

  // Create Drizzle instance
  testDb = drizzle(sqliteDb, { schema })

  // Apply schema (create all tables)
  applySchema(sqliteDb)

  return testDb
}

/**
 * Get the current test database instance
 */
export function getTestDatabase(): TestDatabase {
  if (!testDb) {
    return createTestDatabase()
  }
  return testDb
}

/**
 * Close and clean up the test database
 */
export function closeTestDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
    testDb = null
  }
}

/**
 * Reset the test database (drop all data, keep schema)
 */
export function resetTestDatabase(): void {
  if (!sqliteDb) {
    createTestDatabase()
    return
  }

  // Get all table names
  const tables = sqliteDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]

  // Delete all data from each table
  for (const { name } of tables) {
    sqliteDb.exec(`DELETE FROM "${name}"`)
  }
}

/**
 * Apply schema to SQLite database
 * Creates all tables defined in the schema
 */
function applySchema(db: Database.Database): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      firebase_uid TEXT,
      role TEXT NOT NULL DEFAULT 'CLIENT',
      admin_level INTEGER NOT NULL DEFAULT 0,
      first_name TEXT NOT NULL,
      last_name TEXT,
      phone TEXT,
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Client profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date_of_birth TEXT,
      ssn_last_four TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      citizenship TEXT,
      gender TEXT,
      marital_status TEXT,
      assigned_lawyer_id TEXT REFERENCES users(id),
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Matters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS matters (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      matter_type TEXT,
      case_number TEXT,
      lead_attorney_id TEXT REFERENCES users(id),
      estimated_value_cents INTEGER,
      actual_value_cents INTEGER,
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by_id TEXT REFERENCES users(id),
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Activities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      user_role TEXT,
      target_type TEXT,
      target_id TEXT,
      journey_id TEXT,
      matter_id TEXT,
      target_name TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      geo_country TEXT,
      related_entities TEXT,
      import_metadata TEXT,
      created_at INTEGER NOT NULL
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
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `)
}

/**
 * Seed test database with sample data
 */
export interface SeedOptions {
  users?: boolean
  clients?: boolean
  matters?: boolean
  integration?: boolean
}

export async function seedTestDatabase(options: SeedOptions = {}): Promise<SeedResult> {
  const db = getTestDatabase()
  const result: SeedResult = {
    users: [],
    clients: [],
    matters: [],
    integration: null
  }

  const now = new Date()

  // Seed users
  if (options.users !== false) {
    const adminUser = {
      id: nanoid(),
      email: 'admin@test.com',
      password: 'hashed_password',
      role: 'ADMIN' as const,
      adminLevel: 3,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now
    }

    const lawyerUser = {
      id: nanoid(),
      email: 'lawyer@test.com',
      password: 'hashed_password',
      role: 'LAWYER' as const,
      adminLevel: 0,
      firstName: 'Test',
      lastName: 'Lawyer',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now
    }

    await db.insert(schema.users).values([adminUser, lawyerUser])
    result.users = [adminUser, lawyerUser]
  }

  // Seed clients
  if (options.clients !== false) {
    const client1 = {
      id: nanoid(),
      email: 'client1@test.com',
      role: 'CLIENT' as const,
      adminLevel: 0,
      firstName: 'Test',
      lastName: 'Client',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now
    }

    const client2 = {
      id: nanoid(),
      email: 'client2@test.com',
      role: 'CLIENT' as const,
      adminLevel: 0,
      firstName: 'Another',
      lastName: 'Client',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now
    }

    await db.insert(schema.users).values([client1, client2])
    result.clients = [client1, client2]
  }

  // Seed matters
  if (options.matters !== false && result.clients.length > 0 && result.users.length > 0) {
    const matter1 = {
      id: nanoid(),
      clientId: result.clients[0]!.id,
      title: 'Test Estate Plan',
      status: 'ACTIVE' as const,
      leadAttorneyId: result.users.find(u => u.role === 'LAWYER')?.id || null,
      createdAt: now,
      updatedAt: now
    }

    await db.insert(schema.matters).values([matter1])
    result.matters = [matter1]
  }

  // Seed integration
  if (options.integration) {
    const integration = {
      id: nanoid(),
      type: 'LAWMATICS',
      name: 'Test Lawmatics Integration',
      credentialsKey: 'test-credentials-key',
      status: 'CONNECTED' as const,
      createdAt: now,
      updatedAt: now
    }

    await db.insert(schema.integrations).values([integration])
    result.integration = integration
  }

  return result
}

export interface SeedResult {
  users: Array<typeof schema.users.$inferSelect>
  clients: Array<typeof schema.users.$inferSelect>
  matters: Array<typeof schema.matters.$inferSelect>
  integration: typeof schema.integrations.$inferSelect | null
}

/**
 * Create a mock H3 event for testing
 */
export function createMockEvent(options: {
  user?: Partial<typeof schema.users.$inferSelect>
  method?: string
  path?: string
  body?: any
  query?: Record<string, string>
} = {}): any {
  return {
    context: {
      user: options.user ? {
        id: options.user.id || 'test-user-id',
        email: options.user.email || 'test@example.com',
        role: options.user.role || 'ADMIN',
        adminLevel: options.user.adminLevel ?? 3,
        firstName: options.user.firstName || 'Test',
        lastName: options.user.lastName || 'User',
        status: 'ACTIVE'
      } : undefined,
      cloudflare: {
        env: {
          // Mock env for encryption
          YTP_MASTER_ENCRYPTION_KEY: null
        }
      }
    },
    node: {
      req: {
        method: options.method || 'GET',
        url: options.path || '/',
        headers: {}
      }
    },
    _body: options.body,
    _query: options.query || {}
  }
}
