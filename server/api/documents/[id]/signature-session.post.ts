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
  actionItemId: z.string().optional(),
  // Multi-signer: which signer role (1-6)
  signerRole: z.number().int().min(1).max(6)
    .optional().default(1),
  // Override signer (people.id) for multi-signer flows.
  // The signer is a person identity, so this can be a spouse/fiduciary/
  // witness without a portal user account.
  signerId: z.string().optional()
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

  const {
    tier, expiresIn, sendEmail, message,
    actionItemId, signerRole, signerId: overrideSignerIdRaw,
  } = parseResult.data
  // Boundary cast: incoming string is treated as a people.id.
  const { asPersonId } = await import('../../../db/types/ids')
  const overrideSignerId = overrideSignerIdRaw ? asPersonId(overrideSignerIdRaw) : undefined

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

  // Validate signer role doesn't exceed count
  if (signerRole > document.signerCount) {
    throw createError({
      statusCode: 400,
      message:
        `Signer role ${signerRole} exceeds`
        + ` document signer count`
        + ` (${document.signerCount})`,
    })
  }

  // Check for existing active session for role
  const { and } = await import('drizzle-orm')
  const existingSession = await db
    .select()
    .from(schema.signatureSessions)
    .where(and(
      eq(schema.signatureSessions.documentId,
        documentId),
      eq(schema.signatureSessions.signerRole,
        signerRole),
    ))
    .get()

  if (existingSession
    && !['SIGNED', 'EXPIRED', 'REVOKED']
      .includes(existingSession.status)) {
    throw createError({
      statusCode: 409,
      message:
        'An active session already exists'
        + ` for signer role ${signerRole}`,
      data: {
        sessionId: existingSession.id,
        status: existingSession.status,
      },
    })
  }

  // Get signer — signers are *persons* (not users) so non-portal signers
  // like spouses, fiduciaries, and witnesses can sign too.
  // - overrideSignerId is a people.id (caller specifies a person directly).
  // - Otherwise derive from document.clientId → clients.personId.
  let signer = overrideSignerId
    ? await db
        .select()
        .from(schema.people)
        .where(eq(schema.people.id, overrideSignerId))
        .get()
    : null

  if (!signer && document.clientId) {
    const clientRecord = await db
      .select({ personId: schema.clients.personId })
      .from(schema.clients)
      .where(eq(schema.clients.id, document.clientId))
      .get()
    if (clientRecord) {
      signer = await db
        .select()
        .from(schema.people)
        .where(eq(schema.people.id, clientRecord.personId))
        .get() ?? null
    }
  }

  if (!signer) {
    throw createError({
      statusCode: 400,
      message: 'Signer not found',
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
    signerId: signer.id,
    signerRole,
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
    const { sendTemplatedMessage } = await import('../../../utils/send-templated-message')
    const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your Trusted Planner'

    const formattedExpiresAt = tokenExpiresAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    if (!signer.email) {
      console.warn('[Signature Session] Signer has no email, cannot send templated message:', signer.id)
    }
    else {
      try {
        await sendTemplatedMessage({
          templateSlug: 'signature-request',
          recipientPersonId: signer.id,
          variables: {
            documentTitle: document.title,
            senderName,
            signingUrl,
            expiresAt: formattedExpiresAt,
            message: message || ''
          },
          senderUserId: user.id,
          contextType: 'document',
          contextId: documentId,
          event
        })
        emailSent = true
        console.log('[Signature Session] Email queued for', signer.email)
      }
      catch (err) {
        console.error('[Signature Session] Failed to queue email:', err)
      }
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
