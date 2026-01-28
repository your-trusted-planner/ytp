import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { logActivity } from '../../utils/activity-logger'

const updatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  type: z.enum(['CPA', 'ATTORNEY', 'FINANCIAL_ADVISOR', 'ORGANIZATION', 'OTHER']).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['LAWYER', 'STAFF', 'ADMIN'])

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Partner ID is required'
    })
  }

  const body = await readBody(event)
  const validated = updatePartnerSchema.parse(body)

  const db = useDrizzle()

  // Check partner exists
  const existing = await db
    .select()
    .from(schema.referralPartners)
    .where(eq(schema.referralPartners.id, id))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Referral partner not found'
    })
  }

  // Build update object
  const updates: Record<string, any> = {
    updatedAt: new Date()
  }

  if (validated.name !== undefined) updates.name = validated.name
  if (validated.company !== undefined) updates.company = validated.company || null
  if (validated.type !== undefined) updates.type = validated.type
  if (validated.email !== undefined) updates.email = validated.email || null
  if (validated.phone !== undefined) updates.phone = validated.phone || null
  if (validated.notes !== undefined) updates.notes = validated.notes || null
  if (validated.isActive !== undefined) updates.isActive = validated.isActive

  await db
    .update(schema.referralPartners)
    .set(updates)
    .where(eq(schema.referralPartners.id, id))

  // Log activity
  const partnerName = validated.name || existing.name
  await logActivity({
    type: 'REFERRAL_PARTNER_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'referral_partner', id: id, name: partnerName },
    event,
    details: {
      changes: Object.keys(validated).filter(k => validated[k as keyof typeof validated] !== undefined)
    }
  })

  return {
    success: true,
    message: 'Referral partner updated successfully'
  }
})
