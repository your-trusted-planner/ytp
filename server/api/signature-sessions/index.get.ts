/**
 * GET /api/signature-sessions
 *
 * List signature sessions with filtering options.
 * Used by attorneys to track pending and completed signatures.
 *
 * Query params:
 * - status: Filter by status (PENDING, SIGNED, EXPIRED, etc.)
 * - documentId: Filter by specific document
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */

import { eq, desc, and, or, inArray } from 'drizzle-orm'
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  // Only firm members can view signature sessions
  await requireRole(event, ['ADMIN', 'LAWYER', 'STAFF'])

  const query = getQuery(event)
  const status = query.status as string | undefined
  const documentId = query.documentId as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Build conditions
  const conditions = []

  if (status) {
    // Support comma-separated statuses
    const statuses = status.split(',').map(s => s.trim().toUpperCase())
    if (statuses.length === 1) {
      conditions.push(eq(schema.signatureSessions.status, statuses[0]))
    } else {
      conditions.push(inArray(schema.signatureSessions.status, statuses))
    }
  }

  if (documentId) {
    conditions.push(eq(schema.signatureSessions.documentId, documentId))
  }

  // Fetch sessions with related data
  const sessions = await db
    .select({
      id: schema.signatureSessions.id,
      documentId: schema.signatureSessions.documentId,
      signerId: schema.signatureSessions.signerId,
      signatureTier: schema.signatureSessions.signatureTier,
      status: schema.signatureSessions.status,
      signingToken: schema.signatureSessions.signingToken,
      tokenExpiresAt: schema.signatureSessions.tokenExpiresAt,
      identityVerified: schema.signatureSessions.identityVerified,
      signedAt: schema.signatureSessions.signedAt,
      createdAt: schema.signatureSessions.createdAt,
      updatedAt: schema.signatureSessions.updatedAt,
      // Document info
      documentTitle: schema.documents.title,
      documentStatus: schema.documents.status,
      // Signer info
      signerEmail: schema.users.email,
      signerFirstName: schema.users.firstName,
      signerLastName: schema.users.lastName
    })
    .from(schema.signatureSessions)
    .leftJoin(schema.documents, eq(schema.signatureSessions.documentId, schema.documents.id))
    .leftJoin(schema.users, eq(schema.signatureSessions.signerId, schema.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.signatureSessions.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  // Check for expired sessions and mark them
  const now = new Date()
  const processedSessions = sessions.map(session => {
    const isExpired = session.tokenExpiresAt && new Date(session.tokenExpiresAt) < now
    const effectiveStatus = (session.status === 'PENDING' || session.status === 'IDENTITY_REQUIRED') && isExpired
      ? 'EXPIRED'
      : session.status

    return {
      ...session,
      status: effectiveStatus,
      isExpired,
      signerName: [session.signerFirstName, session.signerLastName].filter(Boolean).join(' ') || session.signerEmail,
      tokenExpiresAt: session.tokenExpiresAt instanceof Date
        ? session.tokenExpiresAt.toISOString()
        : session.tokenExpiresAt,
      signedAt: session.signedAt instanceof Date
        ? session.signedAt.toISOString()
        : session.signedAt,
      createdAt: session.createdAt instanceof Date
        ? session.createdAt.toISOString()
        : session.createdAt,
      updatedAt: session.updatedAt instanceof Date
        ? session.updatedAt.toISOString()
        : session.updatedAt
    }
  })

  // Get counts by status for summary
  const allSessions = await db
    .select({
      status: schema.signatureSessions.status,
      tokenExpiresAt: schema.signatureSessions.tokenExpiresAt
    })
    .from(schema.signatureSessions)
    .all()

  const counts = {
    pending: 0,
    identityRequired: 0,
    signed: 0,
    expired: 0,
    revoked: 0
  }

  allSessions.forEach(s => {
    const isExpired = s.tokenExpiresAt && new Date(s.tokenExpiresAt) < now
    if ((s.status === 'PENDING' || s.status === 'IDENTITY_REQUIRED') && isExpired) {
      counts.expired++
    } else if (s.status === 'PENDING') {
      counts.pending++
    } else if (s.status === 'IDENTITY_REQUIRED') {
      counts.identityRequired++
    } else if (s.status === 'SIGNED') {
      counts.signed++
    } else if (s.status === 'EXPIRED') {
      counts.expired++
    } else if (s.status === 'REVOKED') {
      counts.revoked++
    }
  })

  return {
    sessions: processedSessions,
    counts,
    pagination: {
      limit,
      offset,
      total: allSessions.length
    }
  }
})
