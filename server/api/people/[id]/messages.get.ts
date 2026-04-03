/**
 * GET /api/people/:id/messages
 *
 * Returns communication history for a person.
 * Shows all messages (email, SMS) sent to this person,
 * ordered by most recent first.
 *
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - channel: 'EMAIL' | 'SMS' | 'MMS' (optional filter)
 * - status: message status filter (optional)
 *
 * Requires: LAWYER, ADMIN, or STAFF role
 */

import { eq, desc, and, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({
      statusCode: 400,
      message: 'Person ID required'
    })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0
  const channelFilter = query.channel as string | undefined
  const statusFilter = query.status as string | undefined

  const db = useDrizzle()

  // Verify person exists
  const person = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  // Build conditions
  const conditions = [eq(schema.messages.recipientPersonId, personId)]

  if (channelFilter && ['EMAIL', 'SMS', 'MMS'].includes(channelFilter)) {
    conditions.push(eq(schema.messages.channel, channelFilter as 'EMAIL' | 'SMS' | 'MMS'))
  }

  if (statusFilter) {
    conditions.push(eq(schema.messages.status, statusFilter as any))
  }

  // Get messages
  const messageRows = await db.select({
    id: schema.messages.id,
    channel: schema.messages.channel,
    category: schema.messages.category,
    templateSlug: schema.messages.templateSlug,
    subject: schema.messages.subject,
    status: schema.messages.status,
    contextType: schema.messages.contextType,
    contextId: schema.messages.contextId,
    providerMessageId: schema.messages.providerMessageId,
    failureReason: schema.messages.failureReason,
    senderUserId: schema.messages.senderUserId,
    queuedAt: schema.messages.queuedAt,
    sentAt: schema.messages.sentAt,
    deliveredAt: schema.messages.deliveredAt,
    failedAt: schema.messages.failedAt,
    createdAt: schema.messages.createdAt
  })
    .from(schema.messages)
    .where(and(...conditions))
    .orderBy(desc(schema.messages.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [countResult] = await db.select({
    count: sql<number>`count(*)`
  })
    .from(schema.messages)
    .where(and(...conditions))

  return {
    success: true,
    data: messageRows,
    pagination: {
      total: countResult?.count || 0,
      limit,
      offset,
      hasMore: offset + limit < (countResult?.count || 0)
    }
  }
})
