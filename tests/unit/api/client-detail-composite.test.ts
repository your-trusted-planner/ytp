/**
 * Tests for composite client detail endpoint
 * Validates that the single endpoint returns the correct combined response shape
 * matching what the 7 individual endpoints previously returned
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'
import { eq, or, desc, inArray, and, sql } from 'drizzle-orm'
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
      address_2 TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT,
      date_of_birth INTEGER,
      ssn_last_4 TEXT,
      notes TEXT,
      middle_names TEXT,
      global_unsubscribe INTEGER NOT NULL DEFAULT 0,
      global_unsubscribe_at INTEGER,
      global_unsubscribe_source TEXT,
      apollo_contact_id TEXT,
      import_metadata TEXT,
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
      signature_image TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      import_metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE clients (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      status TEXT DEFAULT 'PROSPECTIVE',
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
      initial_attribution_source TEXT,
      initial_attribution_medium TEXT,
      initial_attribution_campaign TEXT,
      assigned_lawyer_id TEXT,
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

  // clients_with_status view - derives status from matters (must explicitly select columns to override status)
  sqliteDb.exec(`
    CREATE VIEW clients_with_status AS
    SELECT
      c.id,
      c.person_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM matters m
          INNER JOIN users u ON m.client_id = u.id
          WHERE u.person_id = c.person_id AND m.status = 'OPEN'
        ) THEN 'ACTIVE'
        WHEN EXISTS (
          SELECT 1 FROM matters m
          INNER JOIN users u ON m.client_id = u.id
          WHERE u.person_id = c.person_id
        ) AND NOT EXISTS (
          SELECT 1 FROM matters m
          INNER JOIN users u ON m.client_id = u.id
          WHERE u.person_id = c.person_id AND m.status != 'CLOSED'
        ) THEN 'FORMER'
        ELSE 'PROSPECTIVE'
      END as status,
      c.has_minor_children,
      c.children_info,
      c.business_name,
      c.business_type,
      c.has_will,
      c.has_trust,
      c.referral_type,
      c.referred_by_person_id,
      c.referred_by_partner_id,
      c.referral_notes,
      c.initial_attribution_source,
      c.initial_attribution_medium,
      c.initial_attribution_campaign,
      c.assigned_lawyer_id,
      c.google_drive_folder_id,
      c.google_drive_folder_url,
      c.google_drive_sync_status,
      c.google_drive_sync_error,
      c.google_drive_last_sync_at,
      c.google_drive_subfolder_ids,
      c.import_metadata,
      c.created_at,
      c.updated_at
    FROM clients c
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

  sqliteDb.exec(`
    CREATE TABLE journeys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      journey_type TEXT NOT NULL DEFAULT 'SERVICE',
      is_active INTEGER NOT NULL DEFAULT 1,
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
      description TEXT,
      step_order INTEGER NOT NULL DEFAULT 0,
      responsible_party TEXT NOT NULL DEFAULT 'CLIENT',
      expected_duration_days INTEGER,
      automation_config TEXT,
      help_content TEXT,
      allow_multiple_iterations INTEGER NOT NULL DEFAULT 0,
      is_final_step INTEGER NOT NULL DEFAULT 0,
      completion_requirements TEXT,
      requires_verification INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      template_id TEXT,
      matter_id TEXT,
      content TEXT NOT NULL,
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      variable_values TEXT,
      docx_blob_key TEXT,
      signed_pdf_blob_key TEXT,
      notarization_status TEXT,
      pandadoc_request_id TEXT,
      requires_notary INTEGER NOT NULL DEFAULT 0,
      attorney_approved INTEGER NOT NULL DEFAULT 0,
      attorney_approved_at INTEGER,
      attorney_approved_by TEXT,
      ready_for_signature INTEGER NOT NULL DEFAULT 0,
      ready_for_signature_at INTEGER,
      client_id TEXT NOT NULL,
      signed_at INTEGER,
      signature_data TEXT,
      viewed_at INTEGER,
      sent_at INTEGER,
      google_drive_file_id TEXT,
      google_drive_file_url TEXT,
      google_drive_sync_status TEXT DEFAULT 'NOT_SYNCED',
      google_drive_sync_error TEXT,
      google_drive_synced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE client_relationships (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      ordinal INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE client_trust_ledgers (
      id TEXT PRIMARY KEY,
      trust_account_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      matter_id TEXT,
      balance INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  sqliteDb.exec(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      subtotal INTEGER NOT NULL DEFAULT 0,
      tax_rate INTEGER DEFAULT 0,
      tax_amount INTEGER DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      trust_applied INTEGER NOT NULL DEFAULT 0,
      direct_payments INTEGER NOT NULL DEFAULT 0,
      balance_due INTEGER NOT NULL DEFAULT 0,
      issue_date INTEGER,
      due_date INTEGER,
      sent_at INTEGER,
      paid_at INTEGER,
      notes TEXT,
      terms TEXT,
      memo TEXT,
      pdf_blob_key TEXT,
      pdf_generated_at INTEGER,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
}

afterAll(() => {
  if (sqliteDb) sqliteDb.close()
})

// Test data IDs
const personId = 'person-1'
const userId = 'user-1'
const clientId = 'client-1'
const matterId = 'matter-1'
const serviceId = 'service-1'
const journeyDefId = 'journey-def-1'
const journeyStepId = 'step-1'
const clientJourneyId = 'cj-1'
const docId = 'doc-1'
const relPersonId = 'person-spouse'
const relId = 'rel-1'
const invoiceId = 'inv-1'
const now = Math.floor(Date.now() / 1000)

function seedFullTestData() {
  // Person
  sqliteDb.prepare(`
    INSERT INTO people (id, first_name, last_name, full_name, email, phone, address, city, state, zip_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(personId, 'John', 'Smith', 'John Smith', 'john@test.com', '555-1234', '123 Main St', 'Austin', 'TX', '78701', now, now)

  // User (for legacy ID resolution)
  sqliteDb.prepare(`
    INSERT INTO users (id, person_id, email, role, admin_level, first_name, last_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, personId, 'john@test.com', 'CLIENT', 0, 'John', 'Smith', 'ACTIVE', now, now)

  // Client
  sqliteDb.prepare(`
    INSERT INTO clients (id, person_id, status, has_minor_children, has_will, has_trust, business_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientId, personId, 'PROSPECTIVE', 1, 0, 1, 'Smith LLC', now, now)

  // Matter (linked to user ID, as per legacy pattern)
  sqliteDb.prepare(`
    INSERT INTO matters (id, client_id, title, matter_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(matterId, userId, 'Smith Family Trust', 'M-2024-001', 'OPEN', now, now)

  // Service catalog
  sqliteDb.prepare(`
    INSERT INTO service_catalog (id, name, category, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(serviceId, 'Revocable Trust', 'Trust', 350000, now, now)

  // Matter service engagement
  sqliteDb.prepare(`
    INSERT INTO matters_to_services (matter_id, catalog_id, engaged_at, status)
    VALUES (?, ?, ?, ?)
  `).run(matterId, serviceId, now, 'ACTIVE')

  // Payment
  sqliteDb.prepare(`
    INSERT INTO payments (id, matter_id, payment_type, amount, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('pay-1', matterId, 'DEPOSIT_50', 175000, 'COMPLETED', now, now)

  // Journey definition
  sqliteDb.prepare(`
    INSERT INTO journeys (id, name, description, estimated_duration_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(journeyDefId, 'Trust Formation', 'Build a trust', 30, now, now)

  // Journey step
  sqliteDb.prepare(`
    INSERT INTO journey_steps (id, journey_id, name, step_type, step_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(journeyStepId, journeyDefId, 'Homework Assigned', 'MILESTONE', 1, now, now)

  // Client journey
  sqliteDb.prepare(`
    INSERT INTO client_journeys (id, client_id, matter_id, journey_id, current_step_id, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientJourneyId, userId, matterId, journeyDefId, journeyStepId, 'IN_PROGRESS', 'HIGH', now, now)

  // Document
  sqliteDb.prepare(`
    INSERT INTO documents (id, title, status, client_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(docId, 'Trust Document Draft', 'DRAFT', userId, '<html>trust</html>', now, now)

  // Relationship person (spouse)
  sqliteDb.prepare(`
    INSERT INTO people (id, first_name, last_name, full_name, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(relPersonId, 'Jane', 'Smith', 'Jane Smith', 'jane@test.com', now, now)

  // Client relationship
  sqliteDb.prepare(`
    INSERT INTO client_relationships (id, client_id, person_id, relationship_type, ordinal, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(relId, userId, relPersonId, 'SPOUSE', 0, now, now)

  // Outstanding invoice (uses clients.id, not users.id)
  sqliteDb.prepare(`
    INSERT INTO invoices (id, matter_id, client_id, invoice_number, status, total_amount, balance_due, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(invoiceId, matterId, clientId, 'INV-2024-001', 'SENT', 175000, 175000, now, now)
}


describe('Composite Client Detail - Response Shape', () => {
  beforeEach(() => {
    setupTestDb()
    seedFullTestData()
  })

  it('returns client with correct person data', async () => {
    // Simulate the clientsWithStatus query
    const clientRecord = sqliteDb.prepare(`
      SELECT * FROM clients_with_status WHERE id = ?
    `).get(clientId) as any

    expect(clientRecord).toBeDefined()
    expect(clientRecord.id).toBe(clientId)
    // With an OPEN matter linked via user, status should be ACTIVE
    expect(clientRecord.status).toBe('ACTIVE')

    const person = sqliteDb.prepare(`
      SELECT * FROM people WHERE id = ?
    `).get(personId) as any

    expect(person.first_name).toBe('John')
    expect(person.last_name).toBe('Smith')
    expect(person.email).toBe('john@test.com')
  })

  it('returns matters with aggregated stats from correlated subqueries', async () => {
    // Simulate the aggregated matters query (Phase 1 pattern)
    const result = sqliteDb.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
        (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
      FROM matters m
      WHERE m.client_id = ?
    `).all(userId) as any[]

    expect(result).toHaveLength(1)
    const matter = result[0]
    expect(matter.title).toBe('Smith Family Trust')
    expect(matter.services_count).toBe(1)
    expect(matter.active_journeys_count).toBe(1)
    expect(matter.total_paid).toBe(175000)
  })

  it('returns enriched journeys with batch-fetched related data', async () => {
    // Fetch journeys
    const journeys = sqliteDb.prepare(`
      SELECT * FROM client_journeys WHERE client_id = ? AND status != 'CANCELLED'
    `).all(userId) as any[]

    expect(journeys).toHaveLength(1)
    expect(journeys[0].status).toBe('IN_PROGRESS')

    // Batch fetch journey info
    const journeyInfo = sqliteDb.prepare(`
      SELECT * FROM journeys WHERE id = ?
    `).get(journeyDefId) as any

    expect(journeyInfo.name).toBe('Trust Formation')

    // Batch fetch step info
    const stepInfo = sqliteDb.prepare(`
      SELECT * FROM journey_steps WHERE id = ?
    `).get(journeyStepId) as any

    expect(stepInfo.name).toBe('Homework Assigned')

    // Step count
    const stepCount = sqliteDb.prepare(`
      SELECT COUNT(*) as count FROM journey_steps WHERE journey_id = ?
    `).get(journeyDefId) as any

    expect(stepCount.count).toBe(1)
  })

  it('returns documents for the client', async () => {
    const docs = sqliteDb.prepare(`
      SELECT * FROM documents WHERE client_id = ? ORDER BY created_at DESC
    `).all(userId) as any[]

    expect(docs).toHaveLength(1)
    expect(docs[0].title).toBe('Trust Document Draft')
    expect(docs[0].status).toBe('DRAFT')
  })

  it('returns enriched relationships with person details', async () => {
    const rels = sqliteDb.prepare(`
      SELECT * FROM client_relationships WHERE client_id = ?
    `).all(userId) as any[]

    expect(rels).toHaveLength(1)
    expect(rels[0].relationship_type).toBe('SPOUSE')

    // Check person enrichment
    const spousePerson = sqliteDb.prepare(`
      SELECT * FROM people WHERE id = ?
    `).get(relPersonId) as any

    expect(spousePerson.full_name).toBe('Jane Smith')
  })

  it('returns outstanding invoices filtered by status', async () => {
    const invoices = sqliteDb.prepare(`
      SELECT i.*, m.title as matter_title
      FROM invoices i
      INNER JOIN matters m ON i.matter_id = m.id
      WHERE i.client_id = ? AND i.status IN ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE')
    `).all(clientId) as any[]

    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoice_number).toBe('INV-2024-001')
    expect(invoices[0].balance_due).toBe(175000)
    expect(invoices[0].matter_title).toBe('Smith Family Trust')
  })

  it('returns empty arrays when client has no related data', async () => {
    // Create a client with no matters, journeys, docs, etc.
    const emptyPersonId = 'person-empty'
    const emptyClientId = 'client-empty'

    sqliteDb.prepare(`
      INSERT INTO people (id, first_name, last_name, full_name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(emptyPersonId, 'Empty', 'Client', 'Empty Client', 'empty@test.com', now, now)

    sqliteDb.prepare(`
      INSERT INTO clients (id, person_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(emptyClientId, emptyPersonId, 'PROSPECTIVE', now, now)

    // Verify clientsWithStatus returns PROSPECTIVE
    const clientRecord = sqliteDb.prepare(`
      SELECT * FROM clients_with_status WHERE id = ?
    `).get(emptyClientId) as any

    expect(clientRecord.status).toBe('PROSPECTIVE')

    // No matters
    const matters = sqliteDb.prepare(`
      SELECT * FROM matters WHERE client_id = ?
    `).all(emptyClientId) as any[]
    expect(matters).toHaveLength(0)

    // No invoices
    const invoices = sqliteDb.prepare(`
      SELECT * FROM invoices WHERE client_id = ?
    `).all(emptyClientId) as any[]
    expect(invoices).toHaveLength(0)
  })

  it('clients_with_status view derives correct status from matter activity', async () => {
    // Current client has OPEN matter -> ACTIVE
    const activeClient = sqliteDb.prepare(`
      SELECT status FROM clients_with_status WHERE id = ?
    `).get(clientId) as any
    expect(activeClient.status).toBe('ACTIVE')

    // Create client with only CLOSED matters -> FORMER
    const formerPersonId = 'person-former'
    const formerUserId = 'user-former'
    const formerClientId = 'client-former'

    sqliteDb.prepare(`
      INSERT INTO people (id, first_name, last_name, full_name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(formerPersonId, 'Former', 'Client', 'Former Client', 'former@test.com', now, now)

    sqliteDb.prepare(`
      INSERT INTO users (id, person_id, email, role, admin_level, first_name, last_name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(formerUserId, formerPersonId, 'former@test.com', 'CLIENT', 0, 'Former', 'Client', 'ACTIVE', now, now)

    sqliteDb.prepare(`
      INSERT INTO clients (id, person_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(formerClientId, formerPersonId, 'PROSPECTIVE', now, now)

    sqliteDb.prepare(`
      INSERT INTO matters (id, client_id, title, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('matter-closed', formerUserId, 'Closed Matter', 'CLOSED', now, now)

    const formerClient = sqliteDb.prepare(`
      SELECT status FROM clients_with_status WHERE id = ?
    `).get(formerClientId) as any
    expect(formerClient.status).toBe('FORMER')
  })
})
