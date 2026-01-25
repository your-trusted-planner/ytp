/**
 * DELETE /api/admin/integrations/lawmatics/cleanup-imports
 *
 * Deletes all records imported from Lawmatics.
 * This removes people, clients, users, and relationships that were imported.
 *
 * Requires: adminLevel >= 2
 */

import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  // Admin level 2 is enforced by middleware for /api/admin/* routes
  // But let's be explicit for this destructive operation
  const user = event.context.user
  if (!user || (user.adminLevel ?? 0) < 2) {
    throw createError({
      statusCode: 403,
      message: 'Admin level 2 required for this operation'
    })
  }

  const query = getQuery(event)
  const dryRun = query.dryRun === 'true'

  const db = useDrizzle()
  const results: Record<string, number> = {
    relationships: 0,
    clients: 0,
    users: 0,
    people: 0,
    notes: 0
  }

  // Count records that would be affected
  const lawmaticsFilter = sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`

  // Get counts first
  const peopleCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.people)
    .where(lawmaticsFilter)
    .get()

  const usersCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(lawmaticsFilter)
    .get()

  const clientsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.clients)
    .where(sql`person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)
    .get()

  // Count relationships where either person is from Lawmatics
  const relationshipsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.relationships)
    .where(sql`from_person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter}) OR to_person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)
    .get()

  // Count notes attached to imported people
  const notesCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notes)
    .where(sql`entity_type = 'person' AND entity_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)
    .get()

  results.relationships = relationshipsCount?.count ?? 0
  results.clients = clientsCount?.count ?? 0
  results.users = usersCount?.count ?? 0
  results.people = peopleCount?.count ?? 0
  results.notes = notesCount?.count ?? 0

  if (dryRun) {
    return {
      dryRun: true,
      message: 'Dry run - no records deleted',
      wouldDelete: results
    }
  }

  // Perform deletions in correct order to respect foreign key constraints

  // 1. Delete notes attached to imported people
  await db.delete(schema.notes)
    .where(sql`entity_type = 'person' AND entity_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)

  // 2. Delete relationships involving imported people
  await db.delete(schema.relationships)
    .where(sql`from_person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter}) OR to_person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)

  // 3. Clear referral references in clients (don't delete the client, just the reference)
  await db.update(schema.clients)
    .set({ referredByPersonId: null })
    .where(sql`referred_by_person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)

  // 4. Delete clients linked to imported people
  await db.delete(schema.clients)
    .where(sql`person_id IN (SELECT id FROM people WHERE ${lawmaticsFilter})`)

  // 5. Delete users linked to imported people
  await db.delete(schema.users)
    .where(lawmaticsFilter)

  // 6. Finally delete the people
  await db.delete(schema.people)
    .where(lawmaticsFilter)

  console.log(`[Lawmatics Cleanup] Admin ${user.email} deleted imported records:`, results)

  return {
    success: true,
    message: 'Lawmatics imports cleaned up successfully',
    deleted: results
  }
})
