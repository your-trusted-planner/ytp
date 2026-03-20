/**
 * GET /api/admin/migrations/:id/error-summary
 * Aggregated error diagnostics for a migration run
 */

import { eq, sql } from 'drizzle-orm'
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

  // Breakdown by entity type
  const byEntity = await db.all(sql`
    SELECT entity_type, count(*) as count
    FROM migration_errors
    WHERE run_id = ${id}
    GROUP BY entity_type
    ORDER BY count DESC
  `) as { entity_type: string, count: number }[]

  // Breakdown by error type
  const byErrorType = await db.all(sql`
    SELECT error_type, count(*) as count
    FROM migration_errors
    WHERE run_id = ${id}
    GROUP BY error_type
    ORDER BY count DESC
  `) as { error_type: string, count: number }[]

  // Top error patterns: normalize messages by replacing numeric IDs with {id}
  // then group and count
  const patterns = await db.all(sql`
    SELECT
      entity_type,
      error_message,
      count(*) as count
    FROM migration_errors
    WHERE run_id = ${id}
    GROUP BY entity_type, error_message
    ORDER BY count DESC
    LIMIT 200
  `) as { entity_type: string, error_message: string, count: number }[]

  // Group by normalized pattern (replace numeric IDs with placeholder)
  const patternMap = new Map<string, {
    pattern: string
    entityType: string
    count: number
    sampleMessages: string[]
  }>()

  for (const row of patterns) {
    const normalized = row.error_message.replace(/\b\d{5,}\b/g, '{id}')
    const key = `${row.entity_type}:${normalized}`
    const existing = patternMap.get(key)
    if (existing) {
      existing.count += row.count
      if (existing.sampleMessages.length < 3) {
        existing.sampleMessages.push(row.error_message)
      }
    }
    else {
      patternMap.set(key, {
        pattern: normalized,
        entityType: row.entity_type,
        count: row.count,
        sampleMessages: [row.error_message]
      })
    }
  }

  const topPatterns = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    byEntity: byEntity.map(r => ({ entityType: r.entity_type, count: r.count })),
    byErrorType: byErrorType.map(r => ({ errorType: r.error_type, count: r.count })),
    topPatterns: topPatterns.map(p => ({
      pattern: p.pattern,
      entityType: p.entityType,
      count: p.count,
      sampleMessages: p.sampleMessages
    }))
  }
})
