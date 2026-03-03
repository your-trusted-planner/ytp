/**
 * POST /api/admin/integrations/apollo/sync-contacts
 * Trigger a push sync of contacts and preference URLs to Apollo.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'
import { createApolloClientFromIntegration } from '../../../../utils/apollo-client'
import { syncContactsToApollo } from '../../../../utils/apollo-sync'

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

  const body = await readBody(event).catch(() => ({}))
  const clientsOnly = body?.clientsOnly ?? false

  const client = await createApolloClientFromIntegration(
    event,
    integration.id,
    integration.credentialsKey
  )

  const host = getRequestHeader(event, 'host') || 'app.trustandlegacy.com'
  const result = await syncContactsToApollo(client, host, { clientsOnly })

  // Update last sync timestamp
  const timestamps = integration.lastSyncTimestamps
    ? JSON.parse(integration.lastSyncTimestamps)
    : {}
  timestamps.contactSync = new Date().toISOString()

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
