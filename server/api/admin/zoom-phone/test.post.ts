/**
 * POST /api/admin/zoom-phone/test
 * Verify Zoom Phone credentials by fetching an access token and listing
 * the account's phone numbers. Confirms the configured fromPhoneNumber
 * is present in the account.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import {
  getZoomPhoneConfig,
  getZoomPhoneAccessToken,
  listZoomPhoneNumbers,
  ZoomPhoneApiError
} from '../../../utils/zoom-phone-sms'

export default defineEventHandler(async (event) => {
  const db = useDrizzle()

  try {
    // 0. Flush any cached access token so we get a fresh one with current scopes
    try {
      const { kv } = await import('@nuxthub/kv')
      await kv.del('zoom-phone:access-token')
    }
    catch { /* KV unavailable */ }

    // 1. Load the stored config (verifies credentials are present and decryptable)
    const config = await getZoomPhoneConfig(event)

    // 2. Exchange credentials for a fresh access token (verifies S2S OAuth works)
    await getZoomPhoneAccessToken(event)

    // 3. List phone numbers and check if the configured fromPhoneNumber is visible
    const numbers = await listZoomPhoneNumbers(event)
    const configuredNumber = numbers.find(n => n.number === config.fromPhoneNumber)

    let message: string
    let warning: string | null = null

    if (numbers.length === 0) {
      // API returned no numbers — likely a scope or endpoint issue, but auth works
      message = `Credentials verified. Could not list phone numbers (scope may not cover number listing). From-number ${config.fromPhoneNumber} will be used as configured.`
      warning = 'Phone number listing returned empty — verify the from-number is correct in Zoom admin'
    }
    else if (!configuredNumber) {
      const available = numbers.map(n => n.number).join(', ')
      message = `Credentials verified. ${numbers.length} number(s) found but ${config.fromPhoneNumber} not among them: ${available}`
      warning = 'Configured from-number not found in the listed numbers'
    }
    else {
      message = `Verified. ${numbers.length} phone number(s) in account. From-number status: ${configuredNumber.status}`
    }

    await db.update(schema.integrations)
      .set({
        status: 'CONNECTED',
        lastTestedAt: new Date(),
        lastErrorMessage: warning,
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.type, 'ZOOM_PHONE'))

    return {
      success: true,
      message,
      warning,
      fromPhoneNumber: config.fromPhoneNumber,
      phoneNumberCount: numbers.length
    }
  }
  catch (err: any) {
    const message = err instanceof ZoomPhoneApiError
      ? err.message
      : (err?.message || 'Unknown error')

    await db.update(schema.integrations)
      .set({
        status: 'ERROR',
        lastTestedAt: new Date(),
        lastErrorMessage: message,
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.type, 'ZOOM_PHONE'))

    throw createError({
      statusCode: 400,
      message: `Zoom Phone test failed: ${message}`
    })
  }
})
