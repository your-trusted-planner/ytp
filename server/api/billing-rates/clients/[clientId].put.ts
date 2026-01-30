// Update client billing rates
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logActivity } from '../../../utils/activity-logger'
import { resolveEntityName } from '../../../utils/entity-resolver'

const updateClientRatesSchema = z.object({
  attorneyRate: z.number().int().min(0).nullable().optional(),
  staffRate: z.number().int().min(0).nullable().optional(),
  userRates: z.record(z.string(), z.number().int().min(0)).optional(),
  notes: z.string().nullable().optional(),
  effectiveDate: z.string().datetime().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'clientId')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const body = await readBody(event)
  const parsed = updateClientRatesSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.issues
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify client exists
  const [client] = await db
    .select({
      clientId: schema.clients.id,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName,
      email: schema.people.email
    })
    .from(schema.clients)
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .where(eq(schema.clients.id, clientId))
    .limit(1)

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  const { attorneyRate, staffRate, userRates, notes, effectiveDate } = parsed.data
  const now = new Date()

  // Check if rates record exists
  const [existingRates] = await db
    .select()
    .from(schema.clientBillingRates)
    .where(eq(schema.clientBillingRates.clientId, clientId))
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
      .update(schema.clientBillingRates)
      .set(updateData)
      .where(eq(schema.clientBillingRates.clientId, clientId))
  } else {
    // Create new record
    await db.insert(schema.clientBillingRates).values({
      id: nanoid(),
      clientId,
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
  const clientName = await resolveEntityName('client', clientId)

  await logActivity({
    type: 'CLIENT_RATES_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: clientName ? { type: 'client', id: clientId, name: clientName } : undefined,
    event,
    details: {
      changes: Object.keys(parsed.data)
    }
  })

  // Fetch updated rates
  const [rates] = await db
    .select()
    .from(schema.clientBillingRates)
    .where(eq(schema.clientBillingRates.clientId, clientId))
    .limit(1)

  const displayName = client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ') || client.email || 'Unknown'

  return {
    clientId,
    clientName: displayName,
    attorneyRate: rates?.attorneyRate || null,
    staffRate: rates?.staffRate || null,
    userRates: rates?.userRates ? JSON.parse(rates.userRates) : {},
    notes: rates?.notes || null,
    effectiveDate: rates?.effectiveDate || null
  }
})
