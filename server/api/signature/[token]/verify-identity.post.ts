/**
 * POST /api/signature/[token]/verify-identity
 *
 * Public endpoint to verify identity before signing (ENHANCED tier).
 * Supports multiple verification modes:
 * - attestation: Self-attestation with legal acknowledgment
 * - kba: Knowledge-based authentication
 * - manual: Photo ID upload for attorney review
 * - persona: Persona.com KYC (future)
 *
 * All verifications are logged to activity history for audit trail.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../db'
import {
  getVerificationMode,
  verifyByAttestation,
  verifyByKba,
  submitForManualReview,
  getAttestationText,
  getActivityTypeForMode,
  type VerificationMode
} from '../../../utils/identity-verification'
import { captureRequestContext } from '../../../utils/request-context'
import { logActivity } from '../../../utils/activity-logger'

// Attestation mode schema
const attestationSchema = z.object({
  mode: z.literal('attestation'),
  attestationText: z.string().min(10),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the attestation' })
  })
})

// KBA mode schema
const kbaSchema = z.object({
  mode: z.literal('kba'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  lastFourSsn: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits').optional()
})

// Manual mode schema
const manualSchema = z.object({
  mode: z.literal('manual'),
  idImageData: z.string().min(1000, 'Invalid image data'),
  idType: z.enum(['DRIVERS_LICENSE', 'PASSPORT', 'STATE_ID'])
})

// Combined schema
const verifyRequestSchema = z.discriminatedUnion('mode', [
  attestationSchema,
  kbaSchema,
  manualSchema
])

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Signing token required'
    })
  }

  const body = await readBody(event)

  // Get configured verification mode if not specified in request
  const configuredMode = getVerificationMode()
  const requestMode = body?.mode || configuredMode

  // Override mode in body for validation
  if (!body.mode) {
    body.mode = requestMode
  }

  const parseResult = verifyRequestSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parseResult.error.flatten()
    })
  }

  const request = parseResult.data

  if (!isDatabaseAvailable()) {
    throw createError({
      statusCode: 503,
      message: 'Database connection required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
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

  // Validate session requires identity verification
  if (session.signatureTier !== 'ENHANCED') {
    throw createError({
      statusCode: 400,
      message: 'This signing session does not require identity verification'
    })
  }

  if (session.identityVerified) {
    return {
      success: true,
      data: {
        alreadyVerified: true,
        method: session.identityVerificationMethod,
        verifiedAt: session.identityVerifiedAt
      }
    }
  }

  if (session.status === 'SIGNED') {
    throw createError({
      statusCode: 410,
      message: 'Document has already been signed'
    })
  }

  if (session.status === 'REVOKED') {
    throw createError({
      statusCode: 410,
      message: 'Signing session has been revoked'
    })
  }

  // Fetch signer info
  const signer = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.signerId))
    .get()

  if (!signer) {
    throw createError({
      statusCode: 404,
      message: 'Signer not found'
    })
  }

  // Fetch document for activity logging
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, session.documentId))
    .get()

  const signerName = `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || signer.email
  const requestContext = captureRequestContext(event)

  // Process verification based on mode
  let verificationResult

  switch (request.mode) {
    case 'attestation':
      verificationResult = await verifyByAttestation(request, signerName)
      break

    case 'kba':
      // Get stored data for KBA verification
      // Look up person record linked to user if available
      const person = await db
        .select()
        .from(schema.people)
        .where(eq(schema.people.userId, signer.id))
        .get()

      verificationResult = await verifyByKba(request, {
        dateOfBirth: person?.dateOfBirth?.toString() || signer.dateOfBirth?.toString(),
        lastFourSsn: person?.ssnLastFour || undefined
      })
      break

    case 'manual':
      verificationResult = await submitForManualReview(request)
      break

    default:
      throw createError({
        statusCode: 400,
        message: `Unsupported verification mode: ${(request as any).mode}`
      })
  }

  // Log the verification attempt
  const activityType = getActivityTypeForMode(request.mode, verificationResult.success)

  await logActivity({
    type: activityType,
    description: verificationResult.success
      ? `Identity verified via ${request.mode} for "${document?.title || 'document'}"`
      : `Identity verification failed via ${request.mode} for "${document?.title || 'document'}"`,
    userId: signer.id,
    userRole: signer.role,
    target: document ? { type: 'document', id: document.id, name: document.title } : undefined,
    matterId: document?.matterId || undefined,
    event,
    details: {
      signatureSessionId: session.id,
      verificationMode: request.mode,
      verificationSuccess: verificationResult.success,
      ipAddress: requestContext.ipAddress,
      ...(verificationResult.error && { error: verificationResult.error })
    }
  })

  if (!verificationResult.success) {
    throw createError({
      statusCode: 400,
      message: verificationResult.error || 'Identity verification failed'
    })
  }

  // For manual mode, don't mark as verified yet (requires attorney approval)
  const isFullyVerified = request.mode !== 'manual'
  const now = new Date()

  if (isFullyVerified) {
    // Update session with verification status
    await db
      .update(schema.signatureSessions)
      .set({
        identityVerified: true,
        identityVerificationMethod: request.mode.toUpperCase(),
        identityVerifiedAt: now,
        status: 'PENDING', // Can now sign
        updatedAt: now
      })
      .where(eq(schema.signatureSessions.id, session.id))
  } else {
    // Manual mode - store submission but keep IDENTITY_REQUIRED status
    await db
      .update(schema.signatureSessions)
      .set({
        identityVerificationMethod: 'MANUAL_REVIEW',
        // Store ID image reference (in production, store in blob storage)
        updatedAt: now
      })
      .where(eq(schema.signatureSessions.id, session.id))
  }

  return {
    success: true,
    data: {
      verified: isFullyVerified,
      method: request.mode,
      requiresApproval: request.mode === 'manual',
      verifiedAt: isFullyVerified ? now.toISOString() : null,
      metadata: verificationResult.metadata
    }
  }
})
