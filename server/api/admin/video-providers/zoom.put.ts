/**
 * PUT /api/admin/video-providers/zoom
 * Save or update Zoom OAuth app credentials (encrypted in KV).
 * Follows the integrations pattern: encrypt → KV, reference → DB.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { encrypt } from '../../../utils/encryption'
import { generateId } from '../../../utils/auth'

const zoomConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  redirectUri: z.string().min(1, 'Redirect URI is required')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = zoomConfigSchema.parse(body)

  const db = useDrizzle()

  // Check for existing Zoom integration
  const existing = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM'))
    .get()

  // Encrypt all three credentials
  const encryptedClientId = await encrypt(event, data.clientId)
  const encryptedClientSecret = await encrypt(event, data.clientSecret)
  const encryptedRedirectUri = await encrypt(event, data.redirectUri)

  const { kv } = await import('@nuxthub/kv')

  if (existing) {
    // Update existing: re-encrypt and store in KV
    const credentialsKey = existing.credentialsKey || `integration:${existing.id}:credentials`

    await kv.set(credentialsKey, JSON.stringify({
      clientId: encryptedClientId,
      clientSecret: encryptedClientSecret,
      redirectUri: encryptedRedirectUri
    }))

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
    // Create new integration
    const id = generateId()
    const credentialsKey = `integration:${id}:credentials`

    await kv.set(credentialsKey, JSON.stringify({
      clientId: encryptedClientId,
      clientSecret: encryptedClientSecret,
      redirectUri: encryptedRedirectUri
    }))

    const now = new Date()
    await db.insert(schema.integrations).values({
      id,
      type: 'ZOOM',
      name: 'Zoom Video Meetings',
      credentialsKey,
      status: 'CONFIGURED',
      createdAt: now,
      updatedAt: now
    })

    return { success: true, id }
  }
})
