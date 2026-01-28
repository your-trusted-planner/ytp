/**
 * DELETE /api/admin/integrations/:id
 * Delete an integration and its credentials
 */

import { eq } from 'drizzle-orm'
import { kv } from '@nuxthub/kv'
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

  // Fetch existing integration to get credentials key
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

  // Delete credentials from KV
  if (existing.credentialsKey) {
    await kv.del(existing.credentialsKey)
  }

  // Delete from database
  await db.delete(schema.integrations)
    .where(eq(schema.integrations.id, id))

  return {
    success: true,
    message: 'Integration deleted successfully'
  }
})
