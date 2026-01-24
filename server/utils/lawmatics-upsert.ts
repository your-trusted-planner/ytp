/**
 * Lawmatics Import Upsert Logic
 *
 * Handles inserting or updating records during data import.
 * Uses importMetadata.externalId to identify existing records.
 */

import { eq, and, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'
import type {
  TransformedUser,
  TransformedClient,
  TransformedPerson,
  TransformedMatter,
  TransformedNote,
  TransformedActivity,
  ImportMetadata
} from './lawmatics-transformers'

// ===================================
// TYPES
// ===================================

export type UpsertAction = 'created' | 'updated' | 'skipped'

export interface UpsertResult {
  action: UpsertAction
  id: string
  externalId: string
}

export interface BatchUpsertResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ externalId: string; error: string }>
  results: UpsertResult[]
}

// ===================================
// CORE UPSERT FUNCTION
// ===================================

/**
 * Find an existing record by its import source and external ID
 */
async function findByExternalId(
  tableName: 'users' | 'matters' | 'notes' | 'activities' | 'people',
  source: string,
  externalId: string
): Promise<{ id: string } | null> {
  const db = useDrizzle()

  // Use json_extract to query the importMetadata JSON column
  // SQLite syntax: json_extract(column, '$.key')
  const result = await db.all(sql`
    SELECT id FROM ${sql.identifier(tableName)}
    WHERE json_extract(import_metadata, '$.source') = ${source}
      AND json_extract(import_metadata, '$.externalId') = ${externalId}
    LIMIT 1
  `)

  return result.length > 0 ? { id: (result[0] as any).id } : null
}

/**
 * Update the lastSyncedAt timestamp in importMetadata
 */
function updateImportMetadataTimestamp(existingMetadata: string): string {
  try {
    const metadata = JSON.parse(existingMetadata) as ImportMetadata
    metadata.lastSyncedAt = new Date().toISOString()
    return JSON.stringify(metadata)
  } catch {
    return existingMetadata
  }
}

// ===================================
// USER UPSERT (Staff/Attorneys)
// ===================================

/**
 * Upsert a Lawmatics user (staff/attorney)
 */
export async function upsertUser(
  transformed: TransformedUser
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('users', source, externalId)

  if (existing) {
    // Update existing record
    await db.update(schema.users)
      .set({
        email: transformed.email,
        firstName: transformed.firstName,
        lastName: transformed.lastName,
        phone: transformed.phone,
        // Don't update role/adminLevel/status - preserve manual changes
        importMetadata: updateImportMetadataTimestamp(transformed.importMetadata),
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, existing.id))

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new record
  await db.insert(schema.users).values({
    id: transformed.id,
    email: transformed.email,
    firstName: transformed.firstName,
    lastName: transformed.lastName,
    phone: transformed.phone,
    role: transformed.role,
    adminLevel: transformed.adminLevel,
    status: transformed.status,
    importMetadata: transformed.importMetadata,
    createdAt: transformed.createdAt,
    updatedAt: transformed.updatedAt
  })

  return { action: 'created', id: transformed.id, externalId }
}

/**
 * Batch upsert users
 */
export async function batchUpsertUsers(
  users: TransformedUser[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const user of users) {
    try {
      const upsertResult = await upsertUser(user)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(user.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// CLIENT UPSERT (User + Profile)
// ===================================

/**
 * Upsert a Lawmatics contact as a client (user + profile)
 * Uses a transaction to ensure consistency
 */
export async function upsertClient(
  transformed: TransformedClient
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.user.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('users', source, externalId)

  if (existing) {
    // Update existing user
    await db.update(schema.users)
      .set({
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        phone: transformed.user.phone,
        // Don't update role/status - preserve manual changes
        importMetadata: updateImportMetadataTimestamp(transformed.user.importMetadata),
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, existing.id))

    // Update or create profile if provided
    if (transformed.profile) {
      const existingProfile = await db.select()
        .from(schema.clientProfiles)
        .where(eq(schema.clientProfiles.userId, existing.id))
        .get()

      if (existingProfile) {
        await db.update(schema.clientProfiles)
          .set({
            dateOfBirth: transformed.profile.dateOfBirth,
            address: transformed.profile.address,
            city: transformed.profile.city,
            state: transformed.profile.state,
            zipCode: transformed.profile.zipCode,
            updatedAt: new Date()
          })
          .where(eq(schema.clientProfiles.id, existingProfile.id))
      } else {
        await db.insert(schema.clientProfiles).values({
          id: transformed.profile.id,
          userId: existing.id,
          dateOfBirth: transformed.profile.dateOfBirth,
          address: transformed.profile.address,
          city: transformed.profile.city,
          state: transformed.profile.state,
          zipCode: transformed.profile.zipCode,
          createdAt: transformed.profile.createdAt,
          updatedAt: transformed.profile.updatedAt
        })
      }
    }

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new user
  await db.insert(schema.users).values({
    id: transformed.user.id,
    email: transformed.user.email,
    firstName: transformed.user.firstName,
    lastName: transformed.user.lastName,
    phone: transformed.user.phone,
    role: transformed.user.role,
    status: transformed.user.status,
    importMetadata: transformed.user.importMetadata,
    createdAt: transformed.user.createdAt,
    updatedAt: transformed.user.updatedAt
  })

  // Insert profile if provided
  if (transformed.profile) {
    await db.insert(schema.clientProfiles).values({
      id: transformed.profile.id,
      userId: transformed.user.id,
      dateOfBirth: transformed.profile.dateOfBirth,
      address: transformed.profile.address,
      city: transformed.profile.city,
      state: transformed.profile.state,
      zipCode: transformed.profile.zipCode,
      createdAt: transformed.profile.createdAt,
      updatedAt: transformed.profile.updatedAt
    })
  }

  return { action: 'created', id: transformed.user.id, externalId }
}

/**
 * Batch upsert clients
 */
export async function batchUpsertClients(
  clients: TransformedClient[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const client of clients) {
    try {
      const upsertResult = await upsertClient(client)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(client.user.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// PERSON UPSERT (People table)
// ===================================

/**
 * Upsert a Lawmatics contact as a person
 */
export async function upsertPerson(
  transformed: TransformedPerson
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('people', source, externalId)

  if (existing) {
    // Update existing record
    await db.update(schema.people)
      .set({
        firstName: transformed.firstName,
        lastName: transformed.lastName,
        fullName: transformed.fullName,
        email: transformed.email,
        phone: transformed.phone,
        address: transformed.address,
        city: transformed.city,
        state: transformed.state,
        zipCode: transformed.zipCode,
        dateOfBirth: transformed.dateOfBirth,
        entityName: transformed.entityName,
        entityType: transformed.entityType,
        importMetadata: updateImportMetadataTimestamp(transformed.importMetadata),
        updatedAt: new Date()
      })
      .where(eq(schema.people.id, existing.id))

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new record
  await db.insert(schema.people).values({
    id: transformed.id,
    firstName: transformed.firstName,
    lastName: transformed.lastName,
    fullName: transformed.fullName,
    email: transformed.email,
    phone: transformed.phone,
    address: transformed.address,
    city: transformed.city,
    state: transformed.state,
    zipCode: transformed.zipCode,
    dateOfBirth: transformed.dateOfBirth,
    entityName: transformed.entityName,
    entityType: transformed.entityType,
    notes: transformed.notes,
    importMetadata: transformed.importMetadata,
    createdAt: transformed.createdAt,
    updatedAt: transformed.updatedAt
  })

  return { action: 'created', id: transformed.id, externalId }
}

/**
 * Batch upsert people
 */
export async function batchUpsertPeople(
  people: TransformedPerson[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const person of people) {
    try {
      const upsertResult = await upsertPerson(person)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(person.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// MATTER UPSERT
// ===================================

/**
 * Upsert a Lawmatics prospect as a matter
 */
export async function upsertMatter(
  transformed: TransformedMatter
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('matters', source, externalId)

  if (existing) {
    // Update existing record
    await db.update(schema.matters)
      .set({
        clientId: transformed.clientId,
        title: transformed.title,
        matterNumber: transformed.matterNumber,
        description: transformed.description,
        status: transformed.status,
        leadAttorneyId: transformed.leadAttorneyId,
        importMetadata: updateImportMetadataTimestamp(transformed.importMetadata),
        updatedAt: new Date()
      })
      .where(eq(schema.matters.id, existing.id))

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new record
  await db.insert(schema.matters).values({
    id: transformed.id,
    clientId: transformed.clientId,
    title: transformed.title,
    matterNumber: transformed.matterNumber,
    description: transformed.description,
    status: transformed.status,
    leadAttorneyId: transformed.leadAttorneyId,
    importMetadata: transformed.importMetadata,
    createdAt: transformed.createdAt,
    updatedAt: transformed.updatedAt
  })

  return { action: 'created', id: transformed.id, externalId }
}

/**
 * Batch upsert matters
 */
export async function batchUpsertMatters(
  matters: TransformedMatter[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const matter of matters) {
    try {
      const upsertResult = await upsertMatter(matter)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(matter.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// NOTE UPSERT
// ===================================

/**
 * Upsert a Lawmatics note
 */
export async function upsertNote(
  transformed: TransformedNote
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('notes', source, externalId)

  if (existing) {
    // Update existing record
    await db.update(schema.notes)
      .set({
        content: transformed.content,
        importMetadata: updateImportMetadataTimestamp(transformed.importMetadata),
        updatedAt: new Date()
      })
      .where(eq(schema.notes.id, existing.id))

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new record
  await db.insert(schema.notes).values({
    id: transformed.id,
    content: transformed.content,
    entityType: transformed.entityType,
    entityId: transformed.entityId,
    createdBy: transformed.createdBy,
    importMetadata: transformed.importMetadata,
    createdAt: transformed.createdAt,
    updatedAt: transformed.updatedAt
  })

  return { action: 'created', id: transformed.id, externalId }
}

/**
 * Batch upsert notes
 */
export async function batchUpsertNotes(
  notes: TransformedNote[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const note of notes) {
    try {
      const upsertResult = await upsertNote(note)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(note.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// ACTIVITY UPSERT
// ===================================

/**
 * Upsert a Lawmatics activity
 */
export async function upsertActivity(
  transformed: TransformedActivity
): Promise<UpsertResult> {
  const db = useDrizzle()

  // Parse importMetadata to get externalId
  const metadata = JSON.parse(transformed.importMetadata) as ImportMetadata
  const { externalId, source } = metadata

  // Check for existing record
  const existing = await findByExternalId('activities', source, externalId)

  if (existing) {
    // Activities are generally immutable, but update importMetadata for sync tracking
    await db.update(schema.activities)
      .set({
        importMetadata: updateImportMetadataTimestamp(transformed.importMetadata)
      })
      .where(eq(schema.activities.id, existing.id))

    return { action: 'updated', id: existing.id, externalId }
  }

  // Insert new record
  await db.insert(schema.activities).values({
    id: transformed.id,
    type: transformed.type,
    description: transformed.description,
    userId: transformed.userId,
    userRole: transformed.userRole,
    targetType: transformed.targetType,
    targetId: transformed.targetId,
    metadata: transformed.metadata,
    importMetadata: transformed.importMetadata,
    createdAt: transformed.createdAt
  })

  return { action: 'created', id: transformed.id, externalId }
}

/**
 * Batch upsert activities
 */
export async function batchUpsertActivities(
  activities: TransformedActivity[]
): Promise<BatchUpsertResult> {
  const result: BatchUpsertResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const activity of activities) {
    try {
      const upsertResult = await upsertActivity(activity)
      result.results.push(upsertResult)

      if (upsertResult.action === 'created') result.created++
      else if (upsertResult.action === 'updated') result.updated++
      else result.skipped++
    } catch (error) {
      const metadata = JSON.parse(activity.importMetadata) as ImportMetadata
      result.errors.push({
        externalId: metadata.externalId,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return result
}

// ===================================
// LOOKUP MAP BUILDERS
// ===================================

/**
 * Build a lookup map of externalId -> internalId for imported users
 * Used to resolve references during subsequent imports
 */
export async function buildUserLookupMap(
  source: string = 'LAWMATICS'
): Promise<Map<string, string>> {
  const db = useDrizzle()

  const users = await db.all(sql`
    SELECT
      id,
      json_extract(import_metadata, '$.externalId') as external_id
    FROM users
    WHERE json_extract(import_metadata, '$.source') = ${source}
      AND json_extract(import_metadata, '$.externalId') IS NOT NULL
  `)

  const map = new Map<string, string>()
  for (const user of users) {
    const u = user as { id: string; external_id: string }
    if (u.external_id) {
      map.set(u.external_id, u.id)
    }
  }

  return map
}

/**
 * Build a lookup map of externalId -> internalId for imported clients
 */
export async function buildClientLookupMap(
  source: string = 'LAWMATICS'
): Promise<Map<string, string>> {
  const db = useDrizzle()

  const clients = await db.all(sql`
    SELECT
      id,
      json_extract(import_metadata, '$.externalId') as external_id
    FROM users
    WHERE role = 'CLIENT'
      AND json_extract(import_metadata, '$.source') = ${source}
      AND json_extract(import_metadata, '$.externalId') IS NOT NULL
  `)

  const map = new Map<string, string>()
  for (const client of clients) {
    const c = client as { id: string; external_id: string }
    if (c.external_id) {
      map.set(c.external_id, c.id)
    }
  }

  return map
}

/**
 * Build a lookup map of externalId -> internalId for imported matters
 */
export async function buildMatterLookupMap(
  source: string = 'LAWMATICS'
): Promise<Map<string, string>> {
  const db = useDrizzle()

  const matters = await db.all(sql`
    SELECT
      id,
      json_extract(import_metadata, '$.externalId') as external_id
    FROM matters
    WHERE json_extract(import_metadata, '$.source') = ${source}
      AND json_extract(import_metadata, '$.externalId') IS NOT NULL
  `)

  const map = new Map<string, string>()
  for (const matter of matters) {
    const m = matter as { id: string; external_id: string }
    if (m.external_id) {
      map.set(m.external_id, m.id)
    }
  }

  return map
}

/**
 * Build a lookup map of externalId -> internalId for imported people
 */
export async function buildPeopleLookupMap(
  source: string = 'LAWMATICS'
): Promise<Map<string, string>> {
  const db = useDrizzle()

  const people = await db.all(sql`
    SELECT
      id,
      json_extract(import_metadata, '$.externalId') as external_id
    FROM people
    WHERE json_extract(import_metadata, '$.source') = ${source}
      AND json_extract(import_metadata, '$.externalId') IS NOT NULL
  `)

  const map = new Map<string, string>()
  for (const person of people) {
    const p = person as { id: string; external_id: string }
    if (p.external_id) {
      map.set(p.external_id, p.id)
    }
  }

  return map
}
