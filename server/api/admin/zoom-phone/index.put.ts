/**
 * PUT /api/admin/zoom-phone
 * Save or update Zoom Phone Server-to-Server OAuth credentials.
 * Credentials are encrypted and stored in KV; a reference row lives in
 * the `integrations` table (type: ZOOM_PHONE).
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { encrypt } from '../../../utils/encryption'
import { generateId } from '../../../utils/auth'
import { formatE164 } from '../../../utils/phone'

const configSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  fromPhoneNumber: z.string().min(1, 'From phone number is required')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = configSchema.parse(body)

  // Normalize the phone number to E.164 before storing
  const normalized = formatE164(data.fromPhoneNumber)
  if (!normalized) {
    throw createError({
      statusCode: 400,
      message: 'From phone number must be a valid E.164 number (e.g. +15551234567)'
    })
  }

  const db = useDrizzle()

  const existing = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM_PHONE'))
    .get()

  const encryptedAccountId = await encrypt(event, data.accountId)
  const encryptedClientId = await encrypt(event, data.clientId)
  const encryptedClientSecret = await encrypt(event, data.clientSecret)
  const encryptedFromPhoneNumber = await encrypt(event, normalized)

  // Hint is shown in the admin UI status so the user can see which
  // number is configured without decrypting the actual credential.
  const fromPhoneNumberHint = `${normalized.slice(0, 2)}••••${normalized.slice(-4)}`

  const { kv } = await import('@nuxthub/kv')

  const payload = {
    accountId: encryptedAccountId,
    clientId: encryptedClientId,
    clientSecret: encryptedClientSecret,
    fromPhoneNumber: encryptedFromPhoneNumber,
    fromPhoneNumberHint
  }

  // Invalidate any cached access token since credentials may have changed
  try {
    await kv.del('zoom-phone:access-token')
  }
  catch { /* KV unavailable */ }

  if (existing) {
    const credentialsKey = existing.credentialsKey || `integration:${existing.id}:credentials`
    await kv.set(credentialsKey, JSON.stringify(payload))
    await db.update(schema.integrations)
      .set({
        credentialsKey,
        status: 'CONFIGURED',
        lastErrorMessage: null,
        updatedAt: new Date()
      })
      .where(eq(schema.integrations.id, existing.id))
    return { success: true, id: existing.id }
  }
  else {
    const id = generateId()
    const credentialsKey = `integration:${id}:credentials`
    await kv.set(credentialsKey, JSON.stringify(payload))
    const now = new Date()
    await db.insert(schema.integrations).values({
      id,
      type: 'ZOOM_PHONE',
      name: 'Zoom Phone SMS',
      credentialsKey,
      status: 'CONFIGURED',
      createdAt: now,
      updatedAt: now
    })
    return { success: true, id }
  }
})
