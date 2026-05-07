/**
 * POST /api/signature/[token]/sign
 *
 * Public endpoint to submit a signature for a document.
 * No authentication required - access is controlled by the secure token.
 *
 * Captures signature data, generates tamper-evident certificate,
 * and updates document status.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { blob } from 'hub:blob'
import { isDatabaseAvailable } from '../../../db'
import {
  isTokenExpired,
  generateSignatureCertificate,
  sha256,
  CURRENT_TERMS_VERSION
} from '../../../utils/signature-certificate'
import {
  generateSignedPdf,
  appendSignaturePages,
  stampFieldsAndSign,
} from '../../../utils/signed-pdf-generator'
import { captureRequestContext } from '../../../utils/request-context'
import { logActivity } from '../../../utils/activity-logger'
import { triggerSignatureComplete } from '../../../utils/message-triggers'

const signRequestSchema = z.object({
  signatureData: z.string().min(100),
  agreedToTerms: z.boolean().refine(
    val => val === true,
    { message: 'You must agree to the terms' },
  ),
  termsVersion: z.string().optional()
    .default(CURRENT_TERMS_VERSION),
  signatureSource: z.enum(['stored', 'drawn'])
    .optional().default('drawn'),
  // Field values for placed fields
  fieldValues: z.record(z.string(), z.string())
    .optional(),
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Signing token required'
    })
  }

  const body = await readBody(event)
  const parseResult = signRequestSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parseResult.error.flatten()
    })
  }

  const {
    signatureData, termsVersion, fieldValues,
  } = parseResult.data

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

  // Validate session state
  if (session.tokenExpiresAt && isTokenExpired(session.tokenExpiresAt)) {
    await db
      .update(schema.signatureSessions)
      .set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(eq(schema.signatureSessions.id, session.id))

    throw createError({
      statusCode: 410,
      message: 'Signing link has expired'
    })
  }

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

  // For ENHANCED tier, verify identity has been completed
  if (session.signatureTier === 'ENHANCED' && !session.identityVerified) {
    throw createError({
      statusCode: 403,
      message: 'Identity verification required before signing'
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

  // Fetch the signer
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

  // Capture request context for audit trail
  const requestContext = captureRequestContext(event)

  // Generate signature hash
  const signatureHash = await sha256(signatureData)
  const now = new Date()

  // Generate tamper-evident certificate
  const certificate = await generateSignatureCertificate({
    documentId: document.id,
    documentContent: document.content,
    signatureSessionId: session.id,
    signer: {
      userId: signer.id,
      email: signer.email,
      name: `${signer.firstName || ''} ${signer.lastName || ''}`.trim() || signer.email,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      country: requestContext.country,
      region: requestContext.region,
      city: requestContext.city
    },
    verification: {
      tier: session.signatureTier as 'STANDARD' | 'ENHANCED',
      method: session.identityVerificationMethod,
      verifiedAt: session.identityVerifiedAt,
      providerId: session.identityReferenceId
    },
    signatureData,
    termsVersion,
    timestamps: {
      sessionCreated: session.createdAt!,
      documentViewed: document.viewedAt,
      identityVerified: session.identityVerifiedAt,
      termsAccepted: now
    }
  })

  // Update signature session
  await db
    .update(schema.signatureSessions)
    .set({
      status: 'SIGNED',
      signatureData,
      signatureHash,
      signedAt: now,
      fieldValues: fieldValues
        ? JSON.stringify(fieldValues) : null,
      signatureCertificate:
        JSON.stringify(certificate),
      termsAcceptedAt: now,
      termsVersion,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      geolocation: requestContext.country
        ? JSON.stringify({
          country: requestContext.country,
          region: requestContext.region,
          city: requestContext.city,
        })
        : null,
      updatedAt: now,
    })
    .where(
      eq(schema.signatureSessions.id, session.id),
    )

  // Check if ALL signers have now signed
  const { and, ne } = await import('drizzle-orm')
  const allSessions = await db.select({
    id: schema.signatureSessions.id,
    status: schema.signatureSessions.status,
    signerRole:
      schema.signatureSessions.signerRole,
    signatureData:
      schema.signatureSessions.signatureData,
    signedAt: schema.signatureSessions.signedAt,
    signerId: schema.signatureSessions.signerId,
    signatureCertificate:
      schema.signatureSessions
        .signatureCertificate,
  })
    .from(schema.signatureSessions)
    .where(and(
      eq(
        schema.signatureSessions.documentId,
        document.id,
      ),
      ne(
        schema.signatureSessions.status,
        'REVOKED',
      ),
      ne(
        schema.signatureSessions.status,
        'EXPIRED',
      ),
    ))
    .all()

  const allSigned = allSessions.length
    >= document.signerCount
    && allSessions.every(
      s => s.status === 'SIGNED',
    )

  const signerName
    = `${signer.firstName || ''} `
    + `${signer.lastName || ''}`.trim()
    || signer.email
  let signedPdfBlobKey: string | null = null

  // Only generate final PDF when all signed
  if (allSigned) {
    try {
      let pdfBytes: Uint8Array

      // Build session data for all signers
      const signerSessions = await Promise.all(
        allSessions.map(async (s) => {
          const u = await db.select({
            email: schema.users.email,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
          })
            .from(schema.users)
            .where(eq(schema.users.id, s.signerId))
            .get()
          return {
            signerName:
              `${u?.firstName || ''} `
              + `${u?.lastName || ''}`.trim()
              || u?.email || '',
            signerEmail: u?.email || '',
            signatureData: s.signatureData,
            signedAt: s.signedAt || now,
            signerRole: s.signerRole,
            signatureCertificate:
              s.signatureCertificate,
            fieldValues: s.fieldValues,
          }
        }),
      )

      // Parse field placements if they exist
      let placements: any[] = []
      if (document.fieldPlacements) {
        try {
          placements = JSON.parse(
            document.fieldPlacements,
          )
        }
        catch { /* ignore */ }
      }

      if (document.unsignedPdfBlobKey) {
        const unsignedBlob = await blob.get(
          document.unsignedPdfBlobKey,
        )
        if (unsignedBlob) {
          const unsignedBytes = new Uint8Array(
            await unsignedBlob.arrayBuffer(),
          )

          // Use stampFieldsAndSign when
          // field placements exist
          if (placements.length > 0) {
            pdfBytes = await stampFieldsAndSign(
              unsignedBytes,
              placements,
              signerSessions,
            )
          }
          else {
            pdfBytes
              = await appendSignaturePages(
                unsignedBytes,
                signerSessions,
              )
          }
        }
        else {
          pdfBytes = await generateSignedPdf({
            document: {
              id: document.id,
              title: document.title,
              description:
                document.description
                || undefined,
              content: document.content,
            },
            signature: {
              imageData: signatureData,
              signerName,
              signerEmail: signer.email,
              signedAt: now,
            },
            certificate: {
              id: certificate.certificateId,
              documentHash:
                certificate.documentHash,
              signatureHash:
                certificate.signature.dataHash,
              certificateHash:
                certificate.certificateHash,
              tier: session.signatureTier as
                'STANDARD' | 'ENHANCED',
              ipAddress:
                requestContext.ipAddress,
            },
          })
        }
      }
      else {
        pdfBytes = await generateSignedPdf({
          document: {
            id: document.id,
            title: document.title,
            description:
              document.description || undefined,
            content: document.content,
          },
          signature: {
            imageData: signatureData,
            signerName,
            signerEmail: signer.email,
            signedAt: now,
          },
          certificate: {
            id: certificate.certificateId,
            documentHash:
              certificate.documentHash,
            signatureHash:
              certificate.signature.dataHash,
            certificateHash:
              certificate.certificateHash,
            tier: session.signatureTier as
              'STANDARD' | 'ENHANCED',
            ipAddress: requestContext.ipAddress,
          },
        })
      }

      signedPdfBlobKey
        = `documents/${document.id}`
        + `/signed-${Date.now()}.pdf`
      await blob.put(
        signedPdfBlobKey, pdfBytes, {
          contentType: 'application/pdf',
          customMetadata: {
            documentId: document.id,
            certificateId:
              certificate.certificateId,
            signedAt: now.toISOString(),
          },
        },
      )

      console.log(
        '[Signature] Generated signed PDF:',
        signedPdfBlobKey,
      )
    }
    catch (pdfError) {
      console.error(
        '[Signature] Failed to generate PDF:',
        pdfError,
      )
    }
  }

  // Update document status
  const docUpdate: Record<string, any> = {
    updatedAt: now,
  }

  if (allSigned) {
    docUpdate.status = 'SIGNED'
    docUpdate.signatureData = signatureData
    docUpdate.signedAt = now
    if (signedPdfBlobKey) {
      docUpdate.signedPdfBlobKey
        = signedPdfBlobKey
    }
  }

  await db
    .update(schema.documents)
    .set(docUpdate)
    .where(
      eq(schema.documents.id, document.id),
    )

  // Log signing activity
  await logActivity({
    type: 'DOCUMENT_SIGNED',
    userId: signer.id,
    userRole: signer.role,
    target: { type: 'document', id: document.id, name: document.title },
    matterId: document.matterId || undefined,
    event,
    details: {
      signatureSessionId: session.id,
      signatureTier: session.signatureTier,
      certificateId: certificate.certificateId,
      signedAt: now.toISOString()
    }
  })

  // Auto-complete linked action item if present
  let actionItemCompleted = false
  if (session.actionItemId) {
    try {
      // Fetch the action item
      const actionItem = await db
        .select()
        .from(schema.actionItems)
        .where(eq(schema.actionItems.id, session.actionItemId))
        .get()

      if (actionItem && actionItem.status !== 'COMPLETE') {
        // Update action item to COMPLETE
        await db
          .update(schema.actionItems)
          .set({
            status: 'COMPLETE',
            completedAt: now,
            completedBy: signer.id,
            resourceId: session.id, // Link to the signature session
            verificationEvidence: JSON.stringify({
              signatureSessionId: session.id,
              certificateId: certificate.certificateId,
              documentId: document.id,
              signedAt: now.toISOString(),
              signatureTier: session.signatureTier
            }),
            updatedAt: now
          })
          .where(eq(schema.actionItems.id, session.actionItemId))

        actionItemCompleted = true
        console.log('[Signature] Auto-completed action item:', session.actionItemId)

        // Log action item completion
        await logActivity({
          type: 'ESIGN_ACTION_COMPLETED',
          description: `ESIGN action item auto-completed after "${document.title}" was signed`,
          userId: signer.id,
          userRole: signer.role,
          targetType: 'action_item',
          targetId: session.actionItemId,
          matterId: document.matterId || undefined,
          event,
          metadata: {
            actionItemId: session.actionItemId,
            signatureSessionId: session.id,
            documentId: document.id
          }
        })
      }
    }
    catch (actionErr) {
      // Log but don't fail - signature is the critical operation
      console.error('[Signature] Failed to auto-complete action item:', actionErr)
    }
  }

  // Fire-and-forget signature confirmation email
  triggerSignatureComplete({
    signerUserId: signer.id,
    documentId: document.id,
    documentTitle: document.title,
    signedAt: now,
    certificateId: certificate.certificateId,
    event
  })

  return {
    success: true,
    data: {
      documentId: document.id,
      sessionId: session.id,
      signedAt: now.toISOString(),
      certificate: {
        id: certificate.certificateId,
        documentHash: certificate.documentHash,
        signatureHash: certificate.signature.dataHash,
        certificateHash: certificate.certificateHash
      },
      actionItemCompleted,
      actionItemId: session.actionItemId || null
    }
  }
})
