/**
 * GET /api/admin/zoom-phone
 * Return current Zoom Phone SMS integration status.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { isZoomPhoneDryRun } from '../../../utils/zoom-phone-sms'

export default defineEventHandler(async (_event) => {
  const db = useDrizzle()

  const integration = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM_PHONE'))
    .get()

  // We don't return the encrypted credentials — just status + mask indicators
  let fromPhoneNumber: string | null = null
  let hasCredentials = false

  if (integration?.credentialsKey) {
    try {
      const { kv } = await import('@nuxthub/kv')
      const stored = await kv.get(integration.credentialsKey)
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored as Record<string, string>
        hasCredentials = !!(parsed.accountId && parsed.clientId && parsed.clientSecret)
        // fromPhoneNumber is encrypted; we can't decrypt without an event,
        // so just indicate whether it's set
        if (parsed.fromPhoneNumberHint) {
          fromPhoneNumber = parsed.fromPhoneNumberHint
        }
      }
    }
    catch {
      // KV unavailable
    }
  }

  return {
    configured: !!integration,
    status: integration?.status || 'NOT_CONFIGURED',
    hasCredentials,
    fromPhoneNumber,
    lastTestedAt: integration?.lastTestedAt || null,
    lastErrorMessage: integration?.lastErrorMessage || null,
    dryRun: isZoomPhoneDryRun()
  }
})
