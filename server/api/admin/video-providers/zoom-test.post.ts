/**
 * POST /api/admin/video-providers/zoom-test
 * Test Zoom OAuth credentials by attempting to validate them.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { getZoomConfig } from '../../../utils/zoom-tokens'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  try {
    // This will throw if credentials are missing or can't be decrypted
    const config = await getZoomConfig(event)

    // Verify the client ID format looks correct
    if (!config.clientId || config.clientId.length < 10) {
      throw new Error('Client ID appears invalid')
    }

    if (!config.clientSecret || config.clientSecret.length < 10) {
      throw new Error('Client Secret appears invalid')
    }

    if (!config.redirectUri) {
      throw new Error('Redirect URI is missing')
    }

    // Update status to CONNECTED
    await db.update(schema.integrations)
      .set({
        status: 'CONNECTED',
        lastTestedAt: new Date(),
        lastErrorMessage: null,
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.type, 'ZOOM'))

    return {
      success: true,
      message: 'Zoom credentials verified. Redirect URI: ' + config.redirectUri
    }
  }
  catch (err: any) {
    // Update status to ERROR
    await db.update(schema.integrations)
      .set({
        status: 'ERROR',
        lastTestedAt: new Date(),
        lastErrorMessage: err.message,
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.type, 'ZOOM'))

    throw createError({
      statusCode: 400,
      message: `Zoom credential test failed: ${err.message}`
    })
  }
})
