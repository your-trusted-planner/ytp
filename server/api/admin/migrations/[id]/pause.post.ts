/**
 * POST /api/admin/migrations/:id/pause
 * Pause a running migration
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Migration run ID is required'
    })
  }

  const db = useDrizzle()

  const run = await db.select()
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.id, id))
    .get()

  if (!run) {
    throw createError({
      statusCode: 404,
      message: 'Migration run not found'
    })
  }

  if (run.status !== 'RUNNING') {
    throw createError({
      statusCode: 400,
      message: `Cannot pause migration with status: ${run.status}. Only RUNNING migrations can be paused.`
    })
  }

  // Update status to paused
  // The queue consumer will check for this status and skip processing
  await db.update(schema.migrationRuns)
    .set({
      status: 'PAUSED',
      updatedAt: new Date()
    })
    .where(eq(schema.migrationRuns.id, id))

  return {
    success: true,
    message: 'Migration paused. In-flight pages will complete, but no new pages will be processed.'
  }
})
