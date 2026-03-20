/**
 * Tests for client matters API endpoint
 * Validates the aggregated stats query (N+1 fix) and response shape
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { eq, or, sql, and, desc } from 'drizzle-orm'
import * as schema from '../../../server/db/schema'

// Test database setup with all required tables
let sqliteDb: Database.Database
let db: ReturnType<typeof drizzle<typeof schema>>

function setupTestDb() {
  sqliteDb = new Database(':memory:')
  db = drizzle(sqliteDb, { schema })

  sqliteDb.exec(`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      person_type TEXT NOT NULL DEFAULT 'individual',
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      county TEXT,
      date_of_birth TEXT,
      ssn_last4 TEXT,
      entity_name TEXT,
      entity_type TEXT,
      entity_ein TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      person_id TEXT REFERENCES people(id),
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
      signature_image TEXT,
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      status TEXT DEFAULT 'PROSPECT',
      has_minor_children INTEGER DEFAULT 0,
      children_info TEXT,
      has_will INTEGER DEFAULT 0,
      has_trust INTEGER DEFAULT 0,
      business_name TEXT,
      business_type TEXT,
      referral_type TEXT,
      referred_by_person_id TEXT,
      referred_by_partner_id TEXT,
      referral_notes TEXT,
      assigned_lawyer_id TEXT,
      google_drive_folder_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE matters (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id),
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

  sqliteDb.exec(`
    CREATE TABLE service_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      type TEXT NOT NULL DEFAULT 'SINGLE',
      price INTEGER NOT NULL,
      duration TEXT,
      default_attorney_rate INTEGER,
      default_staff_rate INTEGER,
      consultation_fee INTEGER DEFAULT 37500,
      consultation_fee_enabled INTEGER NOT NULL DEFAULT 1,
      engagement_letter_id TEXT,
      workflow_steps TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE matters_to_services (
      matter_id TEXT NOT NULL REFERENCES matters(id),
      catalog_id TEXT NOT NULL REFERENCES service_catalog(id),
      engaged_at INTEGER NOT NULL,
      assigned_attorney_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      start_date INTEGER,
      end_date INTEGER,
      PRIMARY KEY (matter_id, catalog_id)
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE client_journeys (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id),
      matter_id TEXT,
      catalog_id TEXT,
      journey_id TEXT NOT NULL,
      current_step_id TEXT,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      selected_catalog_id TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      paused_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL REFERENCES matters(id),
      payment_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT,
      lawpay_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      paid_at INTEGER,
      notes TEXT,
      fund_source TEXT NOT NULL DEFAULT 'DIRECT',
      trust_transaction_id TEXT,
      invoice_id TEXT,
      check_number TEXT,
      reference_number TEXT,
      recorded_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
}

// Seed helpers
const now = Math.floor(Date.now() / 1000)

function createPerson(overrides: Partial<{ id: string, firstName: string, lastName: string, email: string }> = {}) {
  const id = overrides.id || nanoid()
  sqliteDb.prepare(`INSERT INTO people (id, person_type, first_name, last_name, full_name, email, created_at, updated_at)
    VALUES (?, 'individual', ?, ?, ?, ?, ?, ?)`).run(
    id,
    overrides.firstName || 'Test',
    overrides.lastName || 'Person',
    `${overrides.firstName || 'Test'} ${overrides.lastName || 'Person'}`,
    overrides.email || `${id}@test.com`,
    now, now
  )
  return id
}

function createUser(personId: string, role: string, overrides: Partial<{ id: string, email: string }> = {}) {
  const id = overrides.id || nanoid()
  sqliteDb.prepare(`INSERT INTO users (id, person_id, email, role, admin_level, first_name, last_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 'Test', 'User', 'ACTIVE', ?, ?)`).run(
    id, personId, overrides.email || `${id}@test.com`, role, now, now
  )
  return id
}

function createClient(personId: string, overrides: Partial<{ id: string }> = {}) {
  const id = overrides.id || nanoid()
  sqliteDb.prepare(`INSERT INTO clients (id, person_id, status, created_at, updated_at) VALUES (?, ?, 'PROSPECT', ?, ?)`).run(
    id, personId, now, now
  )
  return id
}

function createMatter(clientUserId: string, title: string, status: string = 'OPEN', overrides: Partial<{ id: string, createdAt: number }> = {}) {
  const id = overrides.id || nanoid()
  sqliteDb.prepare(`INSERT INTO matters (id, client_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, clientUserId, title, status, overrides.createdAt || now, now
  )
  return id
}

function createService(name: string, price: number, overrides: Partial<{ id: string, category: string }> = {}) {
  const id = overrides.id || nanoid()
  sqliteDb.prepare(`INSERT INTO service_catalog (id, name, category, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, name, overrides.category || 'General', price, now, now
  )
  return id
}

function engageService(matterId: string, catalogId: string) {
  sqliteDb.prepare(`INSERT INTO matters_to_services (matter_id, catalog_id, engaged_at) VALUES (?, ?, ?)`).run(
    matterId, catalogId, now
  )
}

function createJourney(clientUserId: string, matterId: string, status: string = 'IN_PROGRESS') {
  const id = nanoid()
  sqliteDb.prepare(`INSERT INTO client_journeys (id, client_id, matter_id, journey_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, clientUserId, matterId, nanoid(), status, now, now
  )
  return id
}

function createPayment(matterId: string, amount: number, status: string = 'COMPLETED') {
  const id = nanoid()
  sqliteDb.prepare(`INSERT INTO payments (id, matter_id, payment_type, amount, status, fund_source, created_at, updated_at) VALUES (?, ?, 'CUSTOM', ?, ?, 'DIRECT', ?, ?)`).run(
    id, matterId, amount, status, now, now
  )
  return id
}

beforeEach(() => {
  setupTestDb()
})

afterAll(() => {
  if (sqliteDb) sqliteDb.close()
})

describe('Client Matters API - Aggregated Stats Query', () => {
  it('should return matters with correct aggregated stats in a single query', () => {
    // Setup: person → user → client, with a matter that has services, journeys, payments
    const personId = createPerson({ firstName: 'John', lastName: 'Doe' })
    const userId = createUser(personId, 'CLIENT')
    const clientId = createClient(personId)

    const matterId = createMatter(userId, 'Smith Family Trust')
    const svc1 = createService('Trust Formation', 500000) // $5000
    const svc2 = createService('Will Preparation', 200000) // $2000
    engageService(matterId, svc1)
    engageService(matterId, svc2)
    createJourney(userId, matterId, 'IN_PROGRESS')
    createJourney(userId, matterId, 'COMPLETED') // should NOT count
    createPayment(matterId, 250000, 'COMPLETED') // $2500
    createPayment(matterId, 100000, 'COMPLETED') // $1000
    createPayment(matterId, 50000, 'PENDING') // should NOT count

    // Run the aggregated query (this is the SQL we'll use in the endpoint)
    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    expect(matters).toHaveLength(1)
    expect(matters[0].services_count).toBe(2)
    expect(matters[0].active_journeys_count).toBe(1) // only IN_PROGRESS
    expect(matters[0].total_paid).toBe(350000) // only COMPLETED payments
  })

  it('should return zero stats for a matter with no related data', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)
    createMatter(userId, 'Empty Matter')

    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    expect(matters).toHaveLength(1)
    expect(matters[0].services_count).toBe(0)
    expect(matters[0].active_journeys_count).toBe(0)
    expect(matters[0].total_paid).toBe(0)
  })

  it('should return empty array when client has no matters', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)

    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    expect(matters).toHaveLength(0)
  })

  it('should correctly aggregate across multiple matters for a client', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)

    const matter1 = createMatter(userId, 'Trust Formation', 'OPEN')
    const matter2 = createMatter(userId, 'Will Update', 'CLOSED')

    const svc1 = createService('Trust', 500000)
    const svc2 = createService('Will', 200000)
    const svc3 = createService('POA', 100000)

    engageService(matter1, svc1)
    engageService(matter1, svc2)
    engageService(matter2, svc3)

    createJourney(userId, matter1, 'IN_PROGRESS')
    createJourney(userId, matter2, 'IN_PROGRESS')
    createJourney(userId, matter2, 'IN_PROGRESS')

    createPayment(matter1, 250000, 'COMPLETED')
    createPayment(matter2, 100000, 'COMPLETED')

    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    expect(matters).toHaveLength(2)

    const trust = matters.find((m: any) => m.title === 'Trust Formation')
    const will = matters.find((m: any) => m.title === 'Will Update')

    expect(trust.services_count).toBe(2)
    expect(trust.active_journeys_count).toBe(1)
    expect(trust.total_paid).toBe(250000)

    expect(will.services_count).toBe(1)
    expect(will.active_journeys_count).toBe(2)
    expect(will.total_paid).toBe(100000)
  })
})

describe('Client Matters API - Batch Services Query', () => {
  it('should fetch all services for multiple matters in a single query', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)

    const matter1 = createMatter(userId, 'Matter 1')
    const matter2 = createMatter(userId, 'Matter 2')

    const svc1 = createService('Trust Formation', 500000, { category: 'Estate' })
    const svc2 = createService('Will Preparation', 200000, { category: 'Estate' })
    const svc3 = createService('LLC Formation', 300000, { category: 'Business' })

    engageService(matter1, svc1)
    engageService(matter1, svc2)
    engageService(matter2, svc3)

    const matterIds = [matter1, matter2]
    const placeholders = matterIds.map(() => '?').join(',')

    const allServices = sqliteDb.prepare(`
      SELECT mts.matter_id, mts.catalog_id, mts.engaged_at, mts.status,
             sc.name, sc.category, sc.price
      FROM matters_to_services mts
      INNER JOIN service_catalog sc ON mts.catalog_id = sc.id
      WHERE mts.matter_id IN (${placeholders})
    `).all(...matterIds) as any[]

    expect(allServices).toHaveLength(3)

    // Group by matter
    const byMatter = allServices.reduce((acc: Record<string, any[]>, svc: any) => {
      if (!acc[svc.matter_id]) acc[svc.matter_id] = []
      acc[svc.matter_id].push(svc)
      return acc
    }, {})

    expect(byMatter[matter1]).toHaveLength(2)
    expect(byMatter[matter2]).toHaveLength(1)
    expect(byMatter[matter2][0].name).toBe('LLC Formation')
    expect(byMatter[matter2][0].price).toBe(300000)
  })
})

describe('Client Matters API - Status Sorting', () => {
  it('should sort matters by status priority (OPEN first) then by creation date desc', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)

    // Create matters with different statuses and timestamps
    createMatter(userId, 'Closed Old', 'CLOSED', { createdAt: now - 3000 })
    createMatter(userId, 'Open Recent', 'OPEN', { createdAt: now - 1000 })
    createMatter(userId, 'Open Old', 'OPEN', { createdAt: now - 2000 })
    createMatter(userId, 'Pending', 'PENDING', { createdAt: now - 500 })

    const statusPriority: Record<string, number> = {
      OPEN: 1,
      IN_PROGRESS: 2,
      PENDING: 3,
      CLOSED: 4
    }

    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    // Sort in JS (same as endpoint does)
    matters.sort((a: any, b: any) => {
      const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
      if (priorityDiff !== 0) return priorityDiff
      return b.created_at - a.created_at
    })

    expect(matters.map((m: any) => m.title)).toEqual([
      'Open Recent',
      'Open Old',
      'Pending',
      'Closed Old'
    ])
  })
})

describe('Client Matters API - Response Shape', () => {
  it('should produce the expected response format with total_expected from services', () => {
    const personId = createPerson()
    const userId = createUser(personId, 'CLIENT')
    createClient(personId)

    const matterId = createMatter(userId, 'Test Matter')
    const svc1 = createService('Service A', 500000)
    const svc2 = createService('Service B', 250000)
    engageService(matterId, svc1)
    engageService(matterId, svc2)
    createPayment(matterId, 300000, 'COMPLETED')

    // Aggregated matters query
    const matters = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    // Batch services query
    const allServices = sqliteDb.prepare(`
      SELECT mts.matter_id, mts.catalog_id, mts.engaged_at, mts.status as mts_status,
             sc.name, sc.category, sc.price
      FROM matters_to_services mts
      INNER JOIN service_catalog sc ON mts.catalog_id = sc.id
      WHERE mts.matter_id IN (?)
    `).all(matterId) as any[]

    // Group services by matter
    const servicesByMatter = allServices.reduce((acc: Record<string, any[]>, svc: any) => {
      if (!acc[svc.matter_id]) acc[svc.matter_id] = []
      acc[svc.matter_id].push(svc)
      return acc
    }, {})

    // Build response (matches endpoint format)
    const response = matters.map((matter: any) => {
      const matterServices = servicesByMatter[matter.id] || []
      const totalExpected = matterServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0)

      return {
        id: matter.id,
        client_id: matter.client_id,
        title: matter.title,
        status: matter.status,
        services_count: matter.services_count,
        active_journeys_count: matter.active_journeys_count,
        total_paid: matter.total_paid,
        total_expected: totalExpected,
        engaged_services: matterServices.map((s: any) => ({
          matter_id: s.matter_id,
          catalog_id: s.catalog_id,
          name: s.name,
          category: s.category,
          price: s.price
        }))
      }
    })

    expect(response).toHaveLength(1)
    const result = response[0]
    expect(result.title).toBe('Test Matter')
    expect(result.services_count).toBe(2)
    expect(result.total_paid).toBe(300000)
    expect(result.total_expected).toBe(750000) // 500000 + 250000
    expect(result.engaged_services).toHaveLength(2)
    expect(result.engaged_services[0]).toHaveProperty('name')
    expect(result.engaged_services[0]).toHaveProperty('category')
    expect(result.engaged_services[0]).toHaveProperty('price')
  })
})
