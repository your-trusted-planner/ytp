/**
 * POST /api/admin/migrations/run-data-migration
 *
 * Run a named data migration script.
 * These are separate from schema migrations and handle data transformation.
 *
 * Data migrations are idempotent - safe to run multiple times.
 */

import { useDrizzle, schema } from '../../../db'
import { sql } from 'drizzle-orm'

// Available data migrations
const DATA_MIGRATIONS: Record<string, { name: string; description: string; steps: string[] }> = {
  'people-consolidation': {
    name: 'People Consolidation',
    description: 'Migrate users to people + clients structure (Belly Button Principle)',
    steps: [
      // Step 1: Create people records for staff/lawyers/admins
      `INSERT INTO people (id, person_type, first_name, last_name, full_name, email, phone, notes, import_metadata, created_at, updated_at)
       SELECT 'person_' || u.id, 'individual', u.first_name, u.last_name,
              COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''),
              u.email, u.phone, NULL,
              json_object('source', 'migration', 'migratedFrom', 'users', 'userId', u.id),
              u.created_at, u.updated_at
       FROM users u
       WHERE u.role NOT IN ('CLIENT', 'LEAD', 'PROSPECT')
         AND NOT EXISTS (SELECT 1 FROM people p WHERE p.id = 'person_' || u.id)`,

      // Step 2: Link staff users to people
      `UPDATE users SET person_id = 'person_' || id
       WHERE role NOT IN ('CLIENT', 'LEAD', 'PROSPECT') AND person_id IS NULL`,

      // Step 3: Create people records for clients
      `INSERT INTO people (id, person_type, first_name, last_name, full_name, email, phone, address, city, state, zip_code, date_of_birth, notes, import_metadata, created_at, updated_at)
       SELECT 'person_' || u.id, 'individual', u.first_name, u.last_name,
              COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''),
              u.email, u.phone, cp.address, cp.city, cp.state, cp.zip_code, cp.date_of_birth, NULL,
              json_object('source', 'migration', 'migratedFrom', 'users+clientProfiles', 'userId', u.id),
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.role IN ('CLIENT', 'LEAD', 'PROSPECT')
         AND NOT EXISTS (SELECT 1 FROM people p WHERE p.id = 'person_' || u.id)`,

      // Step 4: Link client users to people
      `UPDATE users SET person_id = 'person_' || id
       WHERE role IN ('CLIENT', 'LEAD', 'PROSPECT') AND person_id IS NULL`,

      // Step 5: Create clients records
      `INSERT INTO clients (id, person_id, status, has_minor_children, children_info, business_name, business_type, has_will, has_trust, referral_type, referred_by_person_id, referred_by_partner_id, referral_notes, initial_attribution_source, initial_attribution_medium, initial_attribution_campaign, google_drive_folder_id, google_drive_folder_url, google_drive_sync_status, google_drive_sync_error, google_drive_last_sync_at, assigned_lawyer_id, import_metadata, created_at, updated_at)
       SELECT 'client_' || u.id, 'person_' || u.id,
              CASE
                WHEN u.role = 'LEAD' THEN 'LEAD'
                WHEN u.role = 'PROSPECT' OR u.status = 'PROSPECT' THEN 'PROSPECT'
                WHEN u.status = 'INACTIVE' THEN 'INACTIVE'
                ELSE 'ACTIVE'
              END,
              COALESCE(cp.has_minor_children, 0), cp.children_info, cp.business_name, cp.business_type,
              COALESCE(cp.has_will, 0), COALESCE(cp.has_trust, 0),
              cp.referral_type,
              CASE WHEN cp.referred_by_user_id IS NOT NULL THEN 'person_' || cp.referred_by_user_id ELSE NULL END,
              cp.referred_by_partner_id, cp.referral_notes,
              cp.initial_attribution_source, cp.initial_attribution_medium, cp.initial_attribution_campaign,
              cp.google_drive_folder_id, cp.google_drive_folder_url, cp.google_drive_sync_status,
              cp.google_drive_sync_error, cp.google_drive_last_sync_at, cp.assigned_lawyer_id,
              json_object('source', 'migration', 'migratedFrom', 'clientProfiles', 'profileId', cp.id, 'userId', u.id),
              COALESCE(cp.created_at, u.created_at), COALESCE(cp.updated_at, u.updated_at)
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       WHERE u.role IN ('CLIENT', 'LEAD', 'PROSPECT')
         AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.person_id = 'person_' || u.id)`,

      // Step 6: Migrate client relationships
      `INSERT INTO relationships (id, from_person_id, to_person_id, relationship_type, context, context_id, ordinal, notes, created_at, updated_at)
       SELECT 'rel_client_' || cr.id, 'person_' || cr.client_id, cr.person_id, cr.relationship_type,
              'client', NULL, cr.ordinal, cr.notes, cr.created_at, cr.updated_at
       FROM client_relationships cr
       WHERE NOT EXISTS (SELECT 1 FROM relationships r WHERE r.id = 'rel_client_' || cr.id)`,

      // Step 7: Migrate matter relationships
      `INSERT INTO relationships (id, from_person_id, to_person_id, relationship_type, context, context_id, ordinal, notes, created_at, updated_at)
       SELECT 'rel_matter_' || mr.id,
              (SELECT 'person_' || m.client_id FROM matters m WHERE m.id = mr.matter_id),
              mr.person_id, mr.relationship_type, 'matter', mr.matter_id, mr.ordinal, mr.notes,
              mr.created_at, mr.updated_at
       FROM matter_relationships mr
       WHERE NOT EXISTS (SELECT 1 FROM relationships r WHERE r.id = 'rel_matter_' || mr.id)`
    ]
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { migration, dryRun = true } = body || {}

  if (!migration) {
    // Return available migrations
    return {
      success: true,
      availableMigrations: Object.entries(DATA_MIGRATIONS).map(([key, value]) => ({
        key,
        name: value.name,
        description: value.description,
        stepCount: value.steps.length
      }))
    }
  }

  const migrationDef = DATA_MIGRATIONS[migration]
  if (!migrationDef) {
    throw createError({
      statusCode: 400,
      message: `Unknown migration: ${migration}. Available: ${Object.keys(DATA_MIGRATIONS).join(', ')}`
    })
  }

  const db = useDrizzle()
  const results: { step: number; sql: string; rowsAffected?: number; error?: string }[] = []

  // Get counts before migration
  const beforeCounts = {
    people: await db.select({ count: sql<number>`count(*)` }).from(schema.people).get(),
    users: await db.select({ count: sql<number>`count(*)` }).from(schema.users).get(),
    clients: await db.select({ count: sql<number>`count(*)` }).from(schema.clients).get(),
    relationships: await db.select({ count: sql<number>`count(*)` }).from(schema.relationships).get()
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      migration: migrationDef.name,
      description: migrationDef.description,
      stepCount: migrationDef.steps.length,
      beforeCounts: {
        people: beforeCounts.people?.count ?? 0,
        users: beforeCounts.users?.count ?? 0,
        clients: beforeCounts.clients?.count ?? 0,
        relationships: beforeCounts.relationships?.count ?? 0
      },
      message: 'Set dryRun: false to execute the migration'
    }
  }

  // Execute each step
  for (let i = 0; i < migrationDef.steps.length; i++) {
    const stepSql = migrationDef.steps[i]
    try {
      const result = await db.run(sql.raw(stepSql))
      results.push({
        step: i + 1,
        sql: stepSql.substring(0, 100) + '...',
        rowsAffected: result.rowsAffected
      })
    } catch (error) {
      results.push({
        step: i + 1,
        sql: stepSql.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : String(error)
      })
      // Continue with other steps since migration is idempotent
    }
  }

  // Get counts after migration
  const afterCounts = {
    people: await db.select({ count: sql<number>`count(*)` }).from(schema.people).get(),
    users: await db.select({ count: sql<number>`count(*)` }).from(schema.users).get(),
    clients: await db.select({ count: sql<number>`count(*)` }).from(schema.clients).get(),
    relationships: await db.select({ count: sql<number>`count(*)` }).from(schema.relationships).get()
  }

  // Verification queries
  const usersWithoutPerson = await db.select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(sql`person_id IS NULL`)
    .get()

  return {
    success: true,
    migration: migrationDef.name,
    results,
    beforeCounts: {
      people: beforeCounts.people?.count ?? 0,
      users: beforeCounts.users?.count ?? 0,
      clients: beforeCounts.clients?.count ?? 0,
      relationships: beforeCounts.relationships?.count ?? 0
    },
    afterCounts: {
      people: afterCounts.people?.count ?? 0,
      users: afterCounts.users?.count ?? 0,
      clients: afterCounts.clients?.count ?? 0,
      relationships: afterCounts.relationships?.count ?? 0
    },
    verification: {
      usersWithoutPerson: usersWithoutPerson?.count ?? 0
    }
  }
})
