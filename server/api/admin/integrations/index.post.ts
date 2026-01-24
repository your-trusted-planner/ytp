/**
 * POST /api/admin/integrations
 * Create a new integration
 *
 * Stores API credentials encrypted in KV using AES-GCM, with a reference in the database.
 */

import { z } from 'zod'
import { nanoid } from 'nanoid'
import { kv } from '@nuxthub/kv'
import { useDrizzle, schema } from '../../../db'
import { encrypt } from '../../../utils/encryption'

const createIntegrationSchema = z.object({
  type: z.enum(['LAWMATICS', 'WEALTHCOUNSEL', 'CLIO']),
  name: z.string().min(1).max(100),
  accessToken: z.string().min(1, 'API access token is required'),
  settings: z.record(z.any()).optional()
})

export default defineEventHandler(async (event) => {

  const body = await readBody(event)
  const result = createIntegrationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const { type, name, accessToken, settings } = result.data

  const db = useDrizzle()

  // Generate IDs
  const integrationId = nanoid()
  const credentialsKey = `integration:${integrationId}:credentials`

  // Encrypt the access token before storing in KV
  const encryptedToken = await encrypt(event, accessToken)

  // Store encrypted credentials in KV
  await kv.set(credentialsKey, JSON.stringify({
    accessToken: encryptedToken
  }))

  // Store integration metadata in database
  const now = new Date()

  await db.insert(schema.integrations).values({
    id: integrationId,
    type,
    name,
    credentialsKey,
    status: 'CONFIGURED',
    settings: settings ? JSON.stringify(settings) : null,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    integration: {
      id: integrationId,
      type,
      name,
      status: 'CONFIGURED',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  }
})
