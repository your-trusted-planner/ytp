// Update matter billing rates
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'

const updateMatterRatesSchema = z.object({
  attorneyRate: z.number().int().min(0).nullable().optional(),
  staffRate: z.number().int().min(0).nullable().optional(),
  userRates: z.record(z.string(), z.number().int().min(0)).optional(),
  notes: z.string().nullable().optional(),
  effectiveDate: z.string().datetime().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const matterId = getRouterParam(event, 'matterId')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const body = await readBody(event)
  const parsed = updateMatterRatesSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify matter exists
  const [matter] = await db
    .select({
      id: schema.matters.id,
      title: schema.matters.title,
      matterNumber: schema.matters.matterNumber
    })
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .limit(1)

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  const { attorneyRate, staffRate, userRates, notes, effectiveDate } = parsed.data
  const now = new Date()

  // Check if rates record exists
  const [existingRates] = await db
    .select()
    .from(schema.matterBillingRates)
    .where(eq(schema.matterBillingRates.matterId, matterId))
    .limit(1)

  const updateData: Record<string, unknown> = {
    updatedAt: now
  }

  if (attorneyRate !== undefined) {
    updateData.attorneyRate = attorneyRate
  }

  if (staffRate !== undefined) {
    updateData.staffRate = staffRate
  }

  if (userRates !== undefined) {
    updateData.userRates = JSON.stringify(userRates)
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  if (effectiveDate !== undefined) {
    updateData.effectiveDate = effectiveDate ? new Date(effectiveDate) : null
  }

  if (existingRates) {
    // Update existing record
    await db
      .update(schema.matterBillingRates)
      .set(updateData)
      .where(eq(schema.matterBillingRates.matterId, matterId))
  } else {
    // Create new record
    await db.insert(schema.matterBillingRates).values({
      id: nanoid(),
      matterId,
      attorneyRate: attorneyRate ?? null,
      staffRate: staffRate ?? null,
      userRates: userRates ? JSON.stringify(userRates) : null,
      notes: notes ?? null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      createdAt: now,
      updatedAt: now
    })
  }

  // Log the activity
  const matterName = await resolveEntityName('matter', matterId)

  await logActivity({
    type: 'MATTER_RATES_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: matterName ? { type: 'matter', id: matterId, name: matterName } : undefined,
    event,
    details: {
      changes: Object.keys(parsed.data)
    }
  })

  // Fetch updated rates
  const [rates] = await db
    .select()
    .from(schema.matterBillingRates)
    .where(eq(schema.matterBillingRates.matterId, matterId))
    .limit(1)

  return {
    matterId,
    matterTitle: matter.title,
    matterNumber: matter.matterNumber,
    attorneyRate: rates?.attorneyRate || null,
    staffRate: rates?.staffRate || null,
    userRates: rates?.userRates ? JSON.parse(rates.userRates) : {},
    notes: rates?.notes || null,
    effectiveDate: rates?.effectiveDate || null
  }
})
