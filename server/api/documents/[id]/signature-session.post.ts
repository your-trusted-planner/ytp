/**
 * POST /api/documents/[id]/signature-session
 *
 * Creates a new signature session for a document.
 * Used by attorneys to initiate the signing ceremony.
 *
 * Authorization: ADMIN, LAWYER, STAFF (firm roles)
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../db'
import { requireRole } from '../../../utils/rbac'
import { generateId } from '../../../utils/auth'
import {
  generateSigningToken,
  calculateTokenExpiration,
  DEFAULT_TOKEN_EXPIRY_MS
} from '../../../utils/signature-certificate'

const createSessionSchema = z.object({
  tier: z.enum(['STANDARD', 'ENHANCED']),
  expiresIn: z.union([
    z.string().regex(/^\d+(h|d|m)$/),
    z.number().positive()
  ]).optional().default('48h'),
  sendEmail: z.boolean().optional().default(false),
  message: z.string().optional(),
  // Optional link to an ESIGN action item (for journey integration)
  actionItemId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Only firm members can create signature sessions
  const user = await requireRole(event, ['ADMIN', 'LAWYER', 'STAFF'])

  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const body = await readBody(event)
  const parseResult = createSessionSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parseResult.error.flatten()
    })
  }

  const { tier, expiresIn, sendEmail, message, actionItemId } = parseResult.data

  // Database not available in mock mode
  if (!isDatabaseAvailable()) {
    throw createError({
      statusCode: 503,
      message: 'Signature sessions require database connection'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Fetch the document
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Validate document is ready for signature
  if (!document.readyForSignature) {
    throw createError({
      statusCode: 400,
      message: 'Document is not ready for signature. Attorney approval required.'
    })
  }

  // Check for existing active session
  const existingSession = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.documentId, documentId))
    .get()

  if (existingSession && !['SIGNED', 'EXPIRED', 'REVOKED'].includes(existingSession.status)) {
    throw createError({
      statusCode: 409,
      message: 'An active signature session already exists for this document',
      data: { sessionId: existingSession.id, status: existingSession.status }
    })
  }

  // Get signer (document's client)
  const signer = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, document.clientId))
    .get()

  if (!signer) {
    throw createError({
      statusCode: 400,
      message: 'Document client not found'
    })
  }

  // Validate action item if provided
  if (actionItemId) {
    const actionItem = await db
      .select()
      .from(schema.actionItems)
      .where(eq(schema.actionItems.id, actionItemId))
      .get()

    if (!actionItem) {
      throw createError({
        statusCode: 400,
        message: 'Action item not found'
      })
    }

    if (actionItem.actionType !== 'ESIGN') {
      throw createError({
        statusCode: 400,
        message: 'Action item must be of type ESIGN'
      })
    }

    // Verify the action item references this document
    const config = actionItem.config ? JSON.parse(actionItem.config) : {}
    if (config.documentId && config.documentId !== documentId) {
      throw createError({
        statusCode: 400,
        message: 'Action item is linked to a different document'
      })
    }
  }

  // Generate session data
  const sessionId = generateId()
  const signingToken = generateSigningToken()
  const tokenExpiresAt = calculateTokenExpiration(expiresIn)

  // Determine initial status based on tier
  const initialStatus = tier === 'ENHANCED' ? 'IDENTITY_REQUIRED' : 'PENDING'

  // Create the signature session
  await db.insert(schema.signatureSessions).values({
    id: sessionId,
    documentId,
    signerId: document.clientId,
    actionItemId: actionItemId || null,
    signatureTier: tier,
    status: initialStatus,
    signingToken,
    tokenExpiresAt,
    identityVerified: false,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Update document status to SENT
  await db
    .update(schema.documents)
    .set({
      status: 'SENT',
      sentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.documents.id, documentId))

  // Build signing URL
  const config = useRuntimeConfig()
  const baseUrl = config.public?.appUrl || 'http://localhost:3000'
  const signingUrl = `${baseUrl}/sign/${signingToken}`

  // Send email notification if requested
  let emailSent = false
  if (sendEmail) {
    const { sendEmail: sendEmailFn, emailTemplates } = await import('../../../utils/email')
    const signerName = `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || 'there'
    const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your Trusted Planner'

    const { html, text } = emailTemplates.signatureRequest({
      recipientName: signerName,
      documentTitle: document.title,
      senderName,
      signingUrl,
      expiresAt: tokenExpiresAt,
      message
    })

    const emailResult = await sendEmailFn({
      to: signer.email,
      subject: `Document Ready for Signature: ${document.title}`,
      html,
      text,
      tags: [
        { name: 'type', value: 'signature-request' },
        { name: 'document_id', value: documentId },
        { name: 'session_id', value: sessionId }
      ]
    })

    emailSent = emailResult.success
    if (!emailResult.success) {
      console.error('[Signature Session] Failed to send email:', emailResult.error)
    } else {
      console.log('[Signature Session] Email sent to', signer.email)
    }
  }

  return {
    success: true,
    data: {
      sessionId,
      signingUrl,
      signingToken,
      expiresAt: tokenExpiresAt.toISOString(),
      tier,
      status: initialStatus,
      emailSent,
      signer: {
        id: signer.id,
        email: signer.email,
        name: `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || signer.email
      }
    }
  }
})
