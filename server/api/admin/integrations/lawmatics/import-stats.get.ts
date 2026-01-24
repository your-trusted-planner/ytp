/**
 * GET /api/admin/integrations/lawmatics/import-stats
 * Returns counts of records imported from Lawmatics
 */

import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  try {
    // Count users imported from Lawmatics
    const usersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    // Count people imported from Lawmatics
    const peopleResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.people)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    // Count clients imported from Lawmatics
    const clientsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.clients)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    // Count matters imported from Lawmatics
    const mattersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.matters)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    // Count notes imported from Lawmatics
    const notesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notes)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    // Count activities imported from Lawmatics
    const activitiesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.activities)
      .where(sql`json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()

    return {
      users: usersResult?.count ?? 0,
      people: peopleResult?.count ?? 0,
      clients: clientsResult?.count ?? 0,
      matters: mattersResult?.count ?? 0,
      notes: notesResult?.count ?? 0,
      activities: activitiesResult?.count ?? 0
    }
  } catch (error) {
    console.error('[Lawmatics Import Stats] Error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch import statistics'
    })
  }
})
