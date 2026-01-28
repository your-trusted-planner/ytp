/**
 * GET /api/admin/integrations
 * List all integrations
 */

import { desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {

  const db = useDrizzle()

  const integrations = await db
    .select({
      id: schema.integrations.id,
      type: schema.integrations.type,
      name: schema.integrations.name,
      status: schema.integrations.status,
      lastTestedAt: schema.integrations.lastTestedAt,
      lastErrorMessage: schema.integrations.lastErrorMessage,
      lastSyncTimestamps: schema.integrations.lastSyncTimestamps,
      createdAt: schema.integrations.createdAt,
      updatedAt: schema.integrations.updatedAt
      // Note: We explicitly exclude credentialsKey and settings for list view
    })
    .from(schema.integrations)
    .orderBy(desc(schema.integrations.createdAt))
    .all()

  return {
    integrations: integrations.map(integration => ({
      id: integration.id,
      type: integration.type,
      name: integration.name,
      status: integration.status,
      lastTestedAt: integration.lastTestedAt instanceof Date
        ? integration.lastTestedAt.toISOString()
        : integration.lastTestedAt,
      lastErrorMessage: integration.lastErrorMessage,
      lastSyncTimestamps: integration.lastSyncTimestamps
        ? JSON.parse(integration.lastSyncTimestamps)
        : null,
      createdAt: integration.createdAt instanceof Date
        ? integration.createdAt.toISOString()
        : integration.createdAt,
      updatedAt: integration.updatedAt instanceof Date
        ? integration.updatedAt.toISOString()
        : integration.updatedAt
    }))
  }
})
