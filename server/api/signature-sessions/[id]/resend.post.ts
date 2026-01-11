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
import { requireRole } from '../../../utils/auth'
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

  // Send email
  const { sendEmail, emailTemplates } = await import('../../../utils/email')
  const signerName = `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || 'there'
  const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your Trusted Planner'

  const { html, text } = emailTemplates.signatureRequest({
    recipientName: signerName,
    documentTitle: document.title,
    senderName,
    signingUrl,
    expiresAt: new Date(newExpiresAt),
    message: message || 'This is a reminder to sign the document at your earliest convenience.'
  })

  const emailResult = await sendEmail({
    to: signer.email,
    subject: `Reminder: Document Ready for Signature - ${document.title}`,
    html,
    text,
    tags: [
      { name: 'type', value: 'signature-reminder' },
      { name: 'document_id', value: document.id },
      { name: 'session_id', value: sessionId }
    ]
  })

  if (!emailResult.success) {
    throw createError({
      statusCode: 500,
      message: `Failed to send reminder email: ${emailResult.error}`
    })
  }

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
