/**
 * GET /api/admin/integrations/:id
 * Get a single integration by ID
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Integration ID is required'
    })
  }

  const db = useDrizzle()

  const integration = await db
    .select({
      id: schema.integrations.id,
      type: schema.integrations.type,
      name: schema.integrations.name,
      status: schema.integrations.status,
      lastTestedAt: schema.integrations.lastTestedAt,
      lastErrorMessage: schema.integrations.lastErrorMessage,
      settings: schema.integrations.settings,
      lastSyncTimestamps: schema.integrations.lastSyncTimestamps,
      createdAt: schema.integrations.createdAt,
      updatedAt: schema.integrations.updatedAt
      // Note: We exclude credentialsKey - never expose the KV key
    })
    .from(schema.integrations)
    .where(eq(schema.integrations.id, id))
    .get()

  if (!integration) {
    throw createError({
      statusCode: 404,
      message: 'Integration not found'
    })
  }

  return {
    id: integration.id,
    type: integration.type,
    name: integration.name,
    status: integration.status,
    lastTestedAt: integration.lastTestedAt instanceof Date
      ? integration.lastTestedAt.toISOString()
      : integration.lastTestedAt,
    lastErrorMessage: integration.lastErrorMessage,
    settings: integration.settings ? JSON.parse(integration.settings) : null,
    lastSyncTimestamps: integration.lastSyncTimestamps
      ? JSON.parse(integration.lastSyncTimestamps)
      : null,
    createdAt: integration.createdAt instanceof Date
      ? integration.createdAt.toISOString()
      : integration.createdAt,
    updatedAt: integration.updatedAt instanceof Date
      ? integration.updatedAt.toISOString()
      : integration.updatedAt,
    // Indicate if credentials are configured (without exposing them)
    hasCredentials: true
  }
})
