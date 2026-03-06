/**
 * GET /api/admin/integrations/apollo/sync-status
 * Returns last sync timestamps and integration status for Apollo.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'APOLLO'))
    .get()

  if (!integration) {
    return {
      configured: false,
      status: null,
      lastContactSync: null,
      lastOptOutSync: null
    }
  }

  const timestamps = integration.lastSyncTimestamps
    ? JSON.parse(integration.lastSyncTimestamps)
    : {}

  return {
    configured: true,
    status: integration.status,
    lastTestedAt: integration.lastTestedAt,
    lastContactSync: timestamps.contactSync ?? null,
    lastOptOutSync: timestamps.optOutSync ?? null
  }
})
