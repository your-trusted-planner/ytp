/**
 * DELETE /api/matters/[id]
 * Delete a matter and its associated data
 *
 * Query params:
 *   - confirm=true: Required to confirm deletion
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'LAWYER'])

  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  // Require confirmation via query param (avoid readBody for DELETE in Workers)
  const query = getQuery(event)
  if (query.confirm !== 'true') {
    throw createError({
      statusCode: 400,
      message: 'Deletion requires confirmation. Add ?confirm=true to the request.'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Check if matter exists
  const matter = await db
    .select()
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .get()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Delete associated client journeys first (due to foreign key)
  await db
    .delete(schema.clientJourneys)
    .where(eq(schema.clientJourneys.matterId, matterId))

  // Delete associated matter services
  await db
    .delete(schema.matterServices)
    .where(eq(schema.matterServices.matterId, matterId))

  // Delete the matter itself
  await db
    .delete(schema.matters)
    .where(eq(schema.matters.id, matterId))

  return {
    success: true,
    message: 'Matter deleted successfully'
  }
})
