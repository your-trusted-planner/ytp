/**
 * GET /api/signature/[token]
 *
 * Public endpoint to retrieve signing session by token.
 * No authentication required - access is controlled by the secure token.
 *
 * Returns document preview and session status for the signing ceremony.
 */

import { eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { isTokenExpired } from '../../utils/signature-certificate'
import { getVerificationMode } from '../../utils/identity-verification'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Signing token required'
    })
  }

  if (!isDatabaseAvailable()) {
    throw createError({
      statusCode: 503,
      message: 'Database connection required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Find the signature session by token
  const session = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.signingToken, token))
    .get()

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Signing session not found'
    })
  }

  // Check if session is expired
  if (session.tokenExpiresAt && isTokenExpired(session.tokenExpiresAt)) {
    // Update status to EXPIRED if not already
    if (session.status !== 'EXPIRED') {
      await db
        .update(schema.signatureSessions)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(schema.signatureSessions.id, session.id))
    }

    throw createError({
      statusCode: 410,
      message: 'Signing link has expired'
    })
  }

  // Check session status
  if (session.status === 'SIGNED') {
    throw createError({
      statusCode: 410,
      message: 'This document has already been signed'
    })
  }

  if (session.status === 'REVOKED') {
    throw createError({
      statusCode: 410,
      message: 'This signing session has been revoked'
    })
  }

  // Fetch the document
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, session.documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Fetch the signer info including stored signature
  const signer = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      signatureImage: schema.users.signatureImage
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.signerId))
    .get()

  if (!signer) {
    throw createError({
      statusCode: 404,
      message: 'Signer not found'
    })
  }

  // Update document status to VIEWED if not already
  if (document.status === 'SENT') {
    await db
      .update(schema.documents)
      .set({
        status: 'VIEWED',
        viewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, document.id))
  }

  // Determine if signing is ready
  const canSign = session.status === 'PENDING' ||
    (session.status === 'READY') ||
    (session.status === 'IDENTITY_REQUIRED' && session.identityVerified)

  // Determine if identity verification is required
  const requiresIdentityVerification = session.signatureTier === 'ENHANCED'
  const verificationMode = requiresIdentityVerification ? getVerificationMode() : undefined

  return {
    document: {
      id: document.id,
      title: document.title,
      description: document.description,
      content: document.content // HTML content for preview
    },
    session: {
      id: session.id,
      status: session.status,
      tier: session.signatureTier,
      expiresAt: session.tokenExpiresAt?.toISOString() ?? null,
      identityVerified: session.identityVerified ?? false,
      requiresIdentityVerification,
      verificationMode,
      canSign
    },
    signer: {
      name: `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || signer.email,
      email: signer.email,
      // Include stored signature if available for adoption during signing
      storedSignature: signer.signatureImage || null
    }
  }
})
