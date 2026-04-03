/**
 * GET /api/admin/message-templates
 *
 * List all message templates, grouped by category.
 * Returns templates with their variable schemas and channel config.
 *
 * Query params:
 * - category: 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING' (optional filter)
 * - activeOnly: 'true' to show only active templates (default: true)
 */

import { eq, and, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryFilter = query.category as string | undefined
  const activeOnly = query.activeOnly !== 'false'

  const db = useDrizzle()

  const conditions = []
  if (activeOnly) {
    conditions.push(eq(schema.messageTemplates.isActive, true))
  }
  if (categoryFilter && ['TRANSACTIONAL', 'OPERATIONAL', 'MARKETING'].includes(categoryFilter)) {
    conditions.push(eq(schema.messageTemplates.category, categoryFilter as any))
  }

  const templates = await db.select()
    .from(schema.messageTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(schema.messageTemplates.category, schema.messageTemplates.name)

  // Parse JSON fields for the response
  const parsed = templates.map(t => ({
    ...t,
    variableSchema: t.variableSchema ? JSON.parse(t.variableSchema) : [],
    channelConfig: t.channelConfig ? JSON.parse(t.channelConfig) : { email: true, sms: false }
  }))

  return {
    success: true,
    data: parsed
  }
})
