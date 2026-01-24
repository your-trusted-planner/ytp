/**
 * POST /api/admin/migrations/:id/cancel
 * Cancel a migration run
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

  if (run.status === 'COMPLETED' || run.status === 'CANCELLED') {
    throw createError({
      statusCode: 400,
      message: `Cannot cancel migration with status: ${run.status}`
    })
  }

  // Update status to cancelled
  // The queue consumer will check for this status and skip processing
  await db.update(schema.migrationRuns)
    .set({
      status: 'CANCELLED',
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.migrationRuns.id, id))

  return {
    success: true,
    message: 'Migration cancelled. In-flight pages may still complete, but no new pages will be processed.',
    finalProgress: {
      processed: run.processedEntities,
      created: run.createdRecords,
      updated: run.updatedRecords,
      errors: run.errorCount
    }
  }
})
