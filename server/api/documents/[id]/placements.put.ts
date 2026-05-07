// Save field placements for a document.
// Admin/Lawyer only, document must be DRAFT.
import { z } from 'zod'
import { requireRole } from '../../../utils/rbac'

const placementSchema = z.object({
  id: z.string(),
  page: z.number().int().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  type: z.enum([
    'signature', 'initials',
    'date_signed', 'date',
    'name', 'text', 'checkbox',
  ]),
  signerRole: z.number().int().min(1).max(6),
  label: z.string().optional(),
})

const bodySchema = z.object({
  placements: z.array(placementSchema),
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
        message: 'Invalid placements data',
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
      signerCount: schema.documents.signerCount,
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
          'Can only edit placements on DRAFT'
          + ' documents',
      })
    }

    // Validate signer roles don't exceed count
    const maxRole = Math.max(
      0,
      ...parsed.data.placements
        .map(p => p.signerRole),
    )
    if (maxRole > document.signerCount) {
      throw createError({
        statusCode: 400,
        message:
          `Signer role ${maxRole} exceeds`
          + ` document signer count`
          + ` (${document.signerCount})`,
      })
    }

    await db.update(schema.documents)
      .set({
        fieldPlacements: JSON.stringify(
          parsed.data.placements,
        ),
        updatedAt: new Date(),
      })
      .where(
        eq(schema.documents.id, documentId),
      )

    return { success: true }
  },
)
