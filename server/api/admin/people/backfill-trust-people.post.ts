/**
 * POST /api/admin/people/backfill-trust-people
 *
 * One-time migration endpoint. Creates people records (personType='trust')
 * for all existing trusts rows that don't yet have a personId, then sets
 * trusts.personId to the new people record.
 *
 * Safe to run multiple times — skips trusts that already have a personId.
 */

import { nanoid } from 'nanoid'
import { eq, isNull } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const db = useDrizzle()

  // Find all trusts without a people record
  const orphanTrusts = await db.select()
    .from(schema.trusts)
    .where(isNull(schema.trusts.personId))
    .all()

  if (orphanTrusts.length === 0) {
    return { success: true, message: 'No trusts need backfilling', created: 0 }
  }

  const errors: Array<{ trustId: string, error: string }> = []
  let created = 0

  for (const trust of orphanTrusts) {
    try {
      const personId = nanoid()
      const now = new Date()

      // Create the people record
      await db.insert(schema.people).values({
        id: personId,
        personType: 'trust',
        fullName: trust.trustName,
        // Contact info: null for backfilled trusts (can be edited later)
        createdAt: trust.createdAt || now,
        updatedAt: now
      })

      // Bridge: set personId on the trust
      await db.update(schema.trusts)
        .set({ personId, updatedAt: now })
        .where(eq(schema.trusts.id, trust.id))

      created++
    }
    catch (err: any) {
      errors.push({ trustId: trust.id, error: err.message })
    }
  }

  // Log the migration action
  if (created > 0) {
    await logActivity({
      type: 'ADMIN_ACTION',
      userId: user?.id,
      userRole: user?.role,
      event,
      details: {
        action: 'backfill-trust-people',
        created,
        total: orphanTrusts.length,
        errorCount: errors.length
      }
    })
  }

  return {
    success: errors.length === 0,
    message: `Backfilled ${created} of ${orphanTrusts.length} trusts`,
    created,
    total: orphanTrusts.length,
    errors: errors.length > 0 ? errors : undefined
  }
})
