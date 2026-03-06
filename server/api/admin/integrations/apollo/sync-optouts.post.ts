/**
 * POST /api/admin/integrations/apollo/sync-optouts
 * Trigger a pull sync of opt-outs from Apollo.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { createApolloClientFromIntegration } from '../../../../utils/apollo-client'
import { syncOptOutsFromApollo } from '../../../../utils/apollo-sync'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  // Find Apollo integration
  const integration = await db.select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'APOLLO'))
    .get()

  if (!integration) {
    throw createError({ statusCode: 404, message: 'Apollo integration not configured' })
  }

  if (!integration.credentialsKey) {
    throw createError({ statusCode: 400, message: 'Apollo credentials not configured' })
  }

  const client = await createApolloClientFromIntegration(
    event,
    integration.id,
    integration.credentialsKey
  )

  const result = await syncOptOutsFromApollo(client)

  // Update last sync timestamp
  const timestamps = integration.lastSyncTimestamps
    ? JSON.parse(integration.lastSyncTimestamps)
    : {}
  timestamps.optOutSync = new Date().toISOString()

  await db.update(schema.integrations)
    .set({
      lastSyncTimestamps: JSON.stringify(timestamps),
      updatedAt: new Date()
    })
    .where(eq(schema.integrations.id, integration.id))

  return {
    success: true,
    ...result
  }
})
