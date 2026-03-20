/**
 * List video providers with their configuration status.
 * Checks the integrations table for encrypted credentials.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  // Check if Zoom is configured in the integrations table
  const zoomIntegration = await db
    .select({
      id: schema.integrations.id,
      status: schema.integrations.status,
      lastTestedAt: schema.integrations.lastTestedAt,
      lastErrorMessage: schema.integrations.lastErrorMessage
    })
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM'))
    .get()

  const providers = [
    {
      id: 'zoom',
      name: 'Zoom',
      configured: !!zoomIntegration?.id,
      status: zoomIntegration?.status || null,
      lastTestedAt: zoomIntegration?.lastTestedAt || null,
      lastErrorMessage: zoomIntegration?.lastErrorMessage || null,
      description: 'Create Zoom meetings automatically when scheduling appointments'
    },
    {
      id: 'google_meet',
      name: 'Google Meet',
      configured: false,
      status: null,
      lastTestedAt: null,
      lastErrorMessage: null,
      description: 'Google Meet integration (coming soon)'
    }
  ]

  return providers
})
