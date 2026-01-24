/**
 * GET /api/admin/migrations/:id/errors
 * Get error log for a migration run
 */

import { eq, desc, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Migration run ID is required'
    })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 50, 200)
  const entityType = query.entityType as string | undefined
  const errorType = query.errorType as string | undefined

  const db = useDrizzle()

  // Verify run exists
  const run = await db.select({ id: schema.migrationRuns.id })
    .from(schema.migrationRuns)
    .where(eq(schema.migrationRuns.id, id))
    .get()

  if (!run) {
    throw createError({
      statusCode: 404,
      message: 'Migration run not found'
    })
  }

  const offset = (page - 1) * limit

  // Build filter conditions
  const conditions = [eq(schema.migrationErrors.runId, id)]

  if (entityType) {
    conditions.push(eq(schema.migrationErrors.entityType, entityType))
  }

  if (errorType) {
    conditions.push(eq(schema.migrationErrors.errorType, errorType as any))
  }

  // Execute query with all conditions
  const errors = await db
    .select()
    .from(schema.migrationErrors)
    .where(and(...conditions))
    .orderBy(desc(schema.migrationErrors.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  // Get total count
  const allErrors = await db.select({ id: schema.migrationErrors.id })
    .from(schema.migrationErrors)
    .where(eq(schema.migrationErrors.runId, id))
    .all()
  const totalCount = allErrors.length

  // Get error summary by type
  const errorsByType: Record<string, number> = {}
  const errorsByEntity: Record<string, number> = {}

  for (const err of allErrors) {
    // We'd need to fetch all to get accurate counts, but for now just count from the page
  }

  return {
    errors: errors.map(err => ({
      id: err.id,
      entityType: err.entityType,
      externalId: err.externalId,
      errorType: err.errorType,
      errorMessage: err.errorMessage,
      errorDetails: err.errorDetails ? JSON.parse(err.errorDetails) : null,
      retryCount: err.retryCount,
      resolved: err.resolved,
      createdAt: err.createdAt instanceof Date ? err.createdAt.toISOString() : err.createdAt
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  }
})
