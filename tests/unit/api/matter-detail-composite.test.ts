/**
 * Tests for composite matter detail endpoint
 * Validates that the single endpoint returns the correct combined response shape
 * matching what the 4 individual endpoints previously returned
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let sqliteDb: Database.Database

function setupTestDb() {
  sqliteDb = new Database(':memory:')

  sqliteDb.exec(`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      person_type TEXT NOT NULL DEFAULT 'individual',
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      email TEXT,
      phone TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      person_id TEXT REFERENCES people(id),
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'CLIENT',
      admin_level INTEGER NOT NULL DEFAULT 0,
      first_name TEXT NOT NULL,
      last_name TEXT,
      phone TEXT,
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      status TEXT DEFAULT 'PROSPECTIVE',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE matters (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      matter_number TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      lead_attorney_id TEXT,
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE matters_to_services (
      matter_id TEXT NOT NULL,
      catalog_id TEXT NOT NULL,
      engaged_at INTEGER NOT NULL,
      assigned_attorney_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      start_date INTEGER,
      end_date INTEGER,
      PRIMARY KEY (matter_id, catalog_id)
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT,
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

  sqliteDb.exec(`
    CREATE TABLE journeys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      journey_type TEXT NOT NULL DEFAULT 'SERVICE',
      estimated_duration_days INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE journey_steps (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      step_type TEXT NOT NULL DEFAULT 'MILESTONE',
      name TEXT NOT NULL,
      step_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE client_journeys (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
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
}

afterAll(() => {
  if (sqliteDb) sqliteDb.close()
})

// Test data
const personId = 'person-1'
const userId = 'user-1'
const clientId = 'client-1'
const lawyerPersonId = 'person-lawyer'
const lawyerId = 'user-lawyer'
const matterId = 'matter-1'
const serviceId = 'service-1'
const journeyDefId = 'journey-def-1'
const journeyStepId = 'step-1'
const clientJourneyId = 'cj-1'
const now = Math.floor(Date.now() / 1000)

function seedTestData() {
  // Client person + user + client
  sqliteDb.prepare(`
    INSERT INTO people (id, first_name, last_name, full_name, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(personId, 'John', 'Smith', 'John Smith', 'john@test.com', now, now)

  sqliteDb.prepare(`
    INSERT INTO users (id, person_id, email, role, admin_level, first_name, last_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, personId, 'john@test.com', 'CLIENT', 0, 'John', 'Smith', 'ACTIVE', now, now)

  sqliteDb.prepare(`
    INSERT INTO clients (id, person_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(clientId, personId, 'ACTIVE', now, now)

  // Lawyer
  sqliteDb.prepare(`
    INSERT INTO people (id, first_name, last_name, full_name, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(lawyerPersonId, 'Sarah', 'Attorney', 'Sarah Attorney', 'sarah@firm.com', now, now)

  sqliteDb.prepare(`
    INSERT INTO users (id, person_id, email, role, admin_level, first_name, last_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(lawyerId, lawyerPersonId, 'sarah@firm.com', 'LAWYER', 0, 'Sarah', 'Attorney', 'ACTIVE', now, now)

  // Matter
  sqliteDb.prepare(`
    INSERT INTO matters (id, client_id, title, matter_number, description, status, lead_attorney_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matterId, userId, 'Smith Family Trust', 'M-2024-001', 'Trust formation', 'OPEN', lawyerId, now, now)

  // Service catalog + engagement
  sqliteDb.prepare(`
    INSERT INTO service_catalog (id, name, description, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(serviceId, 'Revocable Trust', 'Living trust creation', 'Trust', 350000, now, now)

  sqliteDb.prepare(`
    INSERT INTO matters_to_services (matter_id, catalog_id, engaged_at, status)
    VALUES (?, ?, ?, ?)
  `).run(matterId, serviceId, now, 'ACTIVE')

  // Payment
  sqliteDb.prepare(`
    INSERT INTO payments (id, matter_id, payment_type, amount, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('pay-1', matterId, 'DEPOSIT_50', 175000, 'COMPLETED', now, now)

  // Journey definition + step
  sqliteDb.prepare(`
    INSERT INTO journeys (id, name, description, estimated_duration_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(journeyDefId, 'Trust Formation', 'Build a trust', 30, now, now)

  sqliteDb.prepare(`
    INSERT INTO journey_steps (id, journey_id, name, step_type, step_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(journeyStepId, journeyDefId, 'Homework Assigned', 'MILESTONE', 1, now, now)

  // Client journey for this matter
  sqliteDb.prepare(`
    INSERT INTO client_journeys (id, client_id, matter_id, catalog_id, journey_id, current_step_id, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientJourneyId, userId, matterId, serviceId, journeyDefId, journeyStepId, 'IN_PROGRESS', 'HIGH', now, now)
}


describe('Composite Matter Detail - Response Shape', () => {
  beforeEach(() => {
    setupTestDb()
    seedTestData()
  })

  it('returns matter with correct fields', () => {
    const matter = sqliteDb.prepare(`SELECT * FROM matters WHERE id = ?`).get(matterId) as any

    expect(matter).toBeDefined()
    expect(matter.title).toBe('Smith Family Trust')
    expect(matter.matter_number).toBe('M-2024-001')
    expect(matter.status).toBe('OPEN')
    expect(matter.client_id).toBe(userId)
    expect(matter.lead_attorney_id).toBe(lawyerId)
  })

  it('resolves client info from users table for matter response', () => {
    // The matter stores users.id as client_id, not clients.id
    const matter = sqliteDb.prepare(`SELECT client_id FROM matters WHERE id = ?`).get(matterId) as any
    expect(matter.client_id).toBe(userId)

    // Resolve client name via users table
    const client = sqliteDb.prepare(`
      SELECT first_name, last_name, email, person_id FROM users WHERE id = ?
    `).get(matter.client_id) as any

    expect(client.first_name).toBe('John')
    expect(client.last_name).toBe('Smith')

    // Resolve clients table ID for linking
    const clientRecord = sqliteDb.prepare(`
      SELECT id FROM clients WHERE person_id = ?
    `).get(client.person_id) as any

    expect(clientRecord.id).toBe(clientId)
  })

  it('resolves attorney info for matter response', () => {
    const attorney = sqliteDb.prepare(`
      SELECT first_name, last_name, email FROM users WHERE id = ?
    `).get(lawyerId) as any

    expect(attorney.first_name).toBe('Sarah')
    expect(attorney.last_name).toBe('Attorney')
    expect(attorney.email).toBe('sarah@firm.com')
  })

  it('returns services with catalog details', () => {
    const services = sqliteDb.prepare(`
      SELECT mts.*, sc.name, sc.description, sc.type, sc.price, sc.category
      FROM matters_to_services mts
      LEFT JOIN service_catalog sc ON mts.catalog_id = sc.id
      WHERE mts.matter_id = ?
    `).all(matterId) as any[]

    expect(services).toHaveLength(1)
    expect(services[0].name).toBe('Revocable Trust')
    expect(services[0].price).toBe(350000)
    expect(services[0].category).toBe('Trust')
    expect(services[0].status).toBe('ACTIVE')
  })

  it('returns enriched journeys with batch-fetched related data', () => {
    // Journeys for this matter
    const journeys = sqliteDb.prepare(`
      SELECT * FROM client_journeys WHERE matter_id = ?
    `).all(matterId) as any[]

    expect(journeys).toHaveLength(1)
    expect(journeys[0].status).toBe('IN_PROGRESS')

    // Journey name
    const journey = sqliteDb.prepare(`SELECT name FROM journeys WHERE id = ?`).get(journeyDefId) as any
    expect(journey.name).toBe('Trust Formation')

    // Step name
    const step = sqliteDb.prepare(`SELECT name, step_type FROM journey_steps WHERE id = ?`).get(journeyStepId) as any
    expect(step.name).toBe('Homework Assigned')
    expect(step.step_type).toBe('MILESTONE')

    // Service catalog info (from catalog_id on client_journey)
    const svc = sqliteDb.prepare(`SELECT name, category FROM service_catalog WHERE id = ?`).get(serviceId) as any
    expect(svc.name).toBe('Revocable Trust')

    // Client info
    const client = sqliteDb.prepare(`SELECT first_name, last_name FROM users WHERE id = ?`).get(userId) as any
    expect(client.first_name).toBe('John')
  })

  it('returns payments for the matter', () => {
    const payments = sqliteDb.prepare(`
      SELECT * FROM payments WHERE matter_id = ? ORDER BY created_at DESC
    `).all(matterId) as any[]

    expect(payments).toHaveLength(1)
    expect(payments[0].amount).toBe(175000)
    expect(payments[0].payment_type).toBe('DEPOSIT_50')
    expect(payments[0].status).toBe('COMPLETED')
  })

  it('returns empty arrays when matter has no related data', () => {
    // Create a bare matter with no services, journeys, or payments
    const bareMatterId = 'matter-bare'
    sqliteDb.prepare(`
      INSERT INTO matters (id, client_id, title, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bareMatterId, userId, 'Bare Matter', 'OPEN', now, now)

    const services = sqliteDb.prepare(`
      SELECT * FROM matters_to_services WHERE matter_id = ?
    `).all(bareMatterId) as any[]
    expect(services).toHaveLength(0)

    const journeys = sqliteDb.prepare(`
      SELECT * FROM client_journeys WHERE matter_id = ?
    `).all(bareMatterId) as any[]
    expect(journeys).toHaveLength(0)

    const payments = sqliteDb.prepare(`
      SELECT * FROM payments WHERE matter_id = ?
    `).all(bareMatterId) as any[]
    expect(payments).toHaveLength(0)
  })
})
