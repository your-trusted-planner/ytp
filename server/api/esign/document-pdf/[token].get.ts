// Serve the unsigned PDF for the public signing
// page viewer. Token-gated, no auth required.
import { eq } from 'drizzle-orm'
import { blob } from 'hub:blob'
import { isTokenExpired } from '../../../utils/signature-certificate'

export default defineEventHandler(
  async (event) => {
    const token = getRouterParam(event, 'token')

    if (!token) {
      throw createError({
        statusCode: 400,
        message: 'Signing token required',
      })
    }

    const { useDrizzle, schema } = await import(
      '../../../db'
    )
    const db = useDrizzle()

    const session = await db.select({
      documentId:
        schema.signatureSessions.documentId,
      tokenExpiresAt:
        schema.signatureSessions.tokenExpiresAt,
      status:
        schema.signatureSessions.status,
    })
      .from(schema.signatureSessions)
      .where(
        eq(
          schema.signatureSessions.signingToken,
          token,
        ),
      )
      .get()

    if (!session) {
      throw createError({
        statusCode: 404,
        message: 'Session not found',
      })
    }

    if (
      session.tokenExpiresAt
      && isTokenExpired(session.tokenExpiresAt)
    ) {
      throw createError({
        statusCode: 410,
        message: 'Signing link has expired',
      })
    }

    if (['REVOKED'].includes(session.status)) {
      throw createError({
        statusCode: 410,
        message: 'Session is no longer active',
      })
    }

    const document = await db.select({
      unsignedPdfBlobKey:
        schema.documents.unsignedPdfBlobKey,
    })
      .from(schema.documents)
      .where(
        eq(
          schema.documents.id,
          session.documentId,
        ),
      )
      .get()

    if (!document?.unsignedPdfBlobKey) {
      throw createError({
        statusCode: 404,
        message: 'No PDF available',
      })
    }

    return blob.serve(
      event,
      document.unsignedPdfBlobKey,
    )
  },
)
