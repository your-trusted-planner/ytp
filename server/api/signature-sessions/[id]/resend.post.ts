/**
 * POST /api/signature-sessions/[id]/resend
 *
 * Resend the signature request email for a pending session.
 * Optionally extends the expiration time.
 *
 * Body:
 * - extendExpiration: boolean - Whether to extend the expiration (default: true)
 * - message: string - Optional custom message to include
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireRole } from '../../../utils/rbac'
import { calculateTokenExpiration } from '../../../utils/signature-certificate'

const resendSchema = z.object({
  extendExpiration: z.boolean().optional().default(true),
  message: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Only firm members can resend
  const user = await requireRole(event, ['ADMIN', 'LAWYER', 'STAFF'])

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Session ID required'
    })
  }

  const body = await readBody(event)
  const parseResult = resendSchema.safeParse(body || {})

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parseResult.error.flatten()
    })
  }

  const { extendExpiration, message } = parseResult.data

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

  // Can only resend for pending sessions
  if (session.status === 'SIGNED') {
    throw createError({
      statusCode: 400,
      message: 'Cannot resend - document has already been signed'
    })
  }

  if (session.status === 'REVOKED') {
    throw createError({
      statusCode: 400,
      message: 'Cannot resend - session has been revoked'
    })
  }

  // Get document and signer
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

  // Extend expiration if requested
  let newExpiresAt = session.tokenExpiresAt
  if (extendExpiration) {
    newExpiresAt = calculateTokenExpiration('48h')
    await db
      .update(schema.signatureSessions)
      .set({
        tokenExpiresAt: newExpiresAt,
        status: session.signatureTier === 'ENHANCED' ? 'IDENTITY_REQUIRED' : 'PENDING',
        updatedAt: new Date()
      })
      .where(eq(schema.signatureSessions.id, sessionId))
  }

  // Build signing URL
  const config = useRuntimeConfig()
  const baseUrl = config.public?.appUrl || 'http://localhost:3000'
  const signingUrl = `${baseUrl}/sign/${session.signingToken}`

  // Send email via DB template
  const { sendTemplatedMessage } = await import('../../../utils/send-templated-message')
  const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your Trusted Planner'

  const expiresAtDate = newExpiresAt instanceof Date ? newExpiresAt : new Date(newExpiresAt ?? Date.now())
  const formattedExpiresAt = expiresAtDate.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  if (!signer.personId) {
    throw createError({
      statusCode: 400,
      message: 'Signer has no linked person record — cannot send email'
    })
  }

  await sendTemplatedMessage({
    templateSlug: 'signature-request',
    recipientPersonId: signer.personId,
    variables: {
      documentTitle: document.title,
      senderName,
      signingUrl,
      expiresAt: formattedExpiresAt,
      message: message || 'This is a reminder to sign the document at your earliest convenience.'
    },
    // Prepend "Reminder:" to the template's subject for resend flows
    subjectOverride: 'Reminder: {{documentTitle}} — Document Ready for Signature',
    senderUserId: user.id,
    contextType: 'document',
    contextId: document.id,
    event
  })

  return {
    success: true,
    data: {
      sessionId,
      emailSent: true,
      expiresAt: newExpiresAt instanceof Date ? newExpiresAt.toISOString() : newExpiresAt,
      extendedExpiration: extendExpiration
    }
  }
})
