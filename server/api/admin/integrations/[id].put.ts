/**
 * PUT /api/admin/integrations/:id
 * Update an integration
 *
 * Can update name, settings, and optionally the access token.
 * If accessToken is provided, it encrypts and updates the KV storage.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { kv } from '@nuxthub/kv'
import { useDrizzle, schema } from '../../../db'
import { encrypt } from '../../../utils/encryption'

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  accessToken: z.string().min(1).optional(), // Optional - only updates if provided
  settings: z.record(z.any()).optional()
})

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Integration ID is required'
    })
  }

  const body = await readBody(event)
  const result = updateIntegrationSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const { name, accessToken, settings } = result.data

  const db = useDrizzle()

  // Fetch existing integration
  const existing = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.id, id))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Integration not found'
    })
  }

  // Update credentials in KV if provided (encrypted)
  if (accessToken && existing.credentialsKey) {
    const encryptedToken = await encrypt(event, accessToken)
    await kv.set(existing.credentialsKey, JSON.stringify({
      accessToken: encryptedToken
    }))
  }

  // Build update object
  const updateData: Record<string, any> = {
    updatedAt: new Date()
  }

  if (name !== undefined) {
    updateData.name = name
  }

  if (settings !== undefined) {
    updateData.settings = JSON.stringify(settings)
  }

  // If credentials were updated, reset status to CONFIGURED (needs re-test)
  if (accessToken) {
    updateData.status = 'CONFIGURED'
    updateData.lastTestedAt = null
    updateData.lastErrorMessage = null
  }

  // Update database
  await db.update(schema.integrations)
    .set(updateData)
    .where(eq(schema.integrations.id, id))

  // Fetch updated record
  const updated = await db
    .select({
      id: schema.integrations.id,
      type: schema.integrations.type,
      name: schema.integrations.name,
      status: schema.integrations.status,
      lastTestedAt: schema.integrations.lastTestedAt,
      lastErrorMessage: schema.integrations.lastErrorMessage,
      settings: schema.integrations.settings,
      createdAt: schema.integrations.createdAt,
      updatedAt: schema.integrations.updatedAt
    })
    .from(schema.integrations)
    .where(eq(schema.integrations.id, id))
    .get()

  return {
    success: true,
    integration: {
      id: updated!.id,
      type: updated!.type,
      name: updated!.name,
      status: updated!.status,
      lastTestedAt: updated!.lastTestedAt instanceof Date
        ? updated!.lastTestedAt.toISOString()
        : updated!.lastTestedAt,
      lastErrorMessage: updated!.lastErrorMessage,
      settings: updated!.settings ? JSON.parse(updated!.settings) : null,
      createdAt: updated!.createdAt instanceof Date
        ? updated!.createdAt.toISOString()
        : updated!.createdAt,
      updatedAt: updated!.updatedAt instanceof Date
        ? updated!.updatedAt.toISOString()
        : updated!.updatedAt
    }
  }
})
