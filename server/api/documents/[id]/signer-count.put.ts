// Update the signer count for a document.
// Removes field placements for signers beyond
// the new count. Admin/Lawyer only, DRAFT only.
import { z } from 'zod'
import { requireRole } from '../../../utils/rbac'

const bodySchema = z.object({
  signerCount: z.number().int().min(1).max(6),
})

export default defineEventHandler(
  async (event) => {
    await requireRole(
      event, ['ADMIN', 'LAWYER'],
    )

    const documentId
      = getRouterParam(event, 'id')
    if (!documentId) {
      throw createError({
        statusCode: 400,
        message: 'Document ID required',
      })
    }

    const body = await readBody(event)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid signer count',
        data: parsed.error.flatten(),
      })
    }

    const { useDrizzle, schema } = await import(
      '../../../db'
    )
    const { eq } = await import('drizzle-orm')
    const db = useDrizzle()

    const document = await db.select({
      status: schema.documents.status,
      fieldPlacements:
        schema.documents.fieldPlacements,
    })
      .from(schema.documents)
      .where(
        eq(schema.documents.id, documentId),
      )
      .get()

    if (!document) {
      throw createError({
        statusCode: 404,
        message: 'Document not found',
      })
    }

    if (document.status !== 'DRAFT') {
      throw createError({
        statusCode: 400,
        message:
          'Can only update signer count on'
          + ' DRAFT documents',
      })
    }

    const newCount
      = parsed.data.signerCount

    // Filter out placements for removed signers
    let filteredPlacements
      = document.fieldPlacements
    if (document.fieldPlacements) {
      try {
        const placements = JSON.parse(
          document.fieldPlacements,
        )
        const kept = placements.filter(
          (p: { signerRole: number }) =>
            p.signerRole <= newCount,
        )
        filteredPlacements
          = JSON.stringify(kept)
      }
      catch {
        filteredPlacements = null
      }
    }

    await db.update(schema.documents)
      .set({
        signerCount: newCount,
        fieldPlacements: filteredPlacements,
        updatedAt: new Date(),
      })
      .where(
        eq(schema.documents.id, documentId),
      )

    return {
      success: true,
      signerCount: newCount,
    }
  },
)
