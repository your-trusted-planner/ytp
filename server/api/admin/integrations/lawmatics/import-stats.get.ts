/**
 * GET /api/admin/integrations/lawmatics/import-stats
 * Returns counts of records imported from Lawmatics
 */

import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  // Count users imported from Lawmatics
  const usersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(sql`json_extract(${schema.users.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  // Count people imported from Lawmatics
  const peopleResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.people)
    .where(sql`json_extract(${schema.people.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  // Count clients imported from Lawmatics
  const clientsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.clients)
    .where(sql`json_extract(${schema.clients.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  // Count matters imported from Lawmatics
  const mattersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.matters)
    .where(sql`json_extract(${schema.matters.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  // Count notes imported from Lawmatics
  const notesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notes)
    .where(sql`json_extract(${schema.notes.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  // Count activities imported from Lawmatics
  const activitiesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.activities)
    .where(sql`json_extract(${schema.activities.importMetadata}, '$.source') = 'LAWMATICS'`)
    .get()

  return {
    users: usersResult?.count ?? 0,
    people: peopleResult?.count ?? 0,
    clients: clientsResult?.count ?? 0,
    matters: mattersResult?.count ?? 0,
    notes: notesResult?.count ?? 0,
    activities: activitiesResult?.count ?? 0
  }
})
