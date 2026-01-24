/**
 * POST /api/signature-sessions/[id]/revoke
 *
 * Revoke a pending signature session.
 * The signing link will no longer work.
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  // Only firm members can revoke
  await requireRole(event, ['ADMIN', 'LAWYER', 'STAFF'])

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Session ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Get the session
  const session = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.id, sessionId))
    .get()

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Signature session not found'
    })
  }

  // Can only revoke pending sessions
  if (session.status === 'SIGNED') {
    throw createError({
      statusCode: 400,
      message: 'Cannot revoke - document has already been signed'
    })
  }

  if (session.status === 'REVOKED') {
    throw createError({
      statusCode: 400,
      message: 'Session is already revoked'
    })
  }

  // Revoke the session
  await db
    .update(schema.signatureSessions)
    .set({
      status: 'REVOKED',
      updatedAt: new Date()
    })
    .where(eq(schema.signatureSessions.id, sessionId))

  return {
    success: true,
    data: {
      sessionId,
      status: 'REVOKED'
    }
  }
})
