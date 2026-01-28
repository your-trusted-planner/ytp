/**
 * GET /api/admin/integrations/lawmatics/import-stats
 * Returns counts of records imported from Lawmatics
 */

import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()
  const results: Record<string, number> = {
    users: 0,
    people: 0,
    clients: 0,
    matters: 0,
    notes: 0,
    activities: 0
  }

  // Query each table individually to isolate any failures
  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.users = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting users:', e)
  }

  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.people)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.people = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting people:', e)
  }

  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.clients)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.clients = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting clients:', e)
  }

  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.matters)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.matters = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting matters:', e)
  }

  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notes)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.notes = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting notes:', e)
  }

  try {
    const r = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.activities)
      .where(sql`import_metadata IS NOT NULL AND json_extract(import_metadata, '$.source') = 'LAWMATICS'`)
      .get()
    results.activities = r?.count ?? 0
  } catch (e) {
    console.error('[Import Stats] Error counting activities:', e)
  }

  return results
})
