/**
 * Save or update a draft for the authenticated user.
 * Creates a new draft if none exists, updates the existing one otherwise.
 */
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'

const draftSchema = z.object({
  data: z.record(z.any()),
  lastSectionIndex: z.number().int().min(0).default(0),
  actionItemId: z.string().optional(),
  clientJourneyId: z.string().optional(),
  matterId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF', 'CLIENT'])

  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid draft data' })
  }

  const { data, lastSectionIndex, actionItemId, clientJourneyId, matterId } = parsed.data
  const db = useDrizzle()
  const now = new Date()

  // Find existing draft
  let conditions = [
    eq(schema.formSubmissions.formId, formId),
    eq(schema.formSubmissions.status, 'draft'),
    eq(schema.formSubmissions.submittedByUserId, user.id)
  ]
  if (actionItemId) {
    conditions.push(eq(schema.formSubmissions.actionItemId, actionItemId))
  }

  const existing = await db.select({ id: schema.formSubmissions.id })
    .from(schema.formSubmissions)
    .where(and(...conditions))
    .limit(1)
    .get()

  if (existing) {
    // Update existing draft
    await db.update(schema.formSubmissions)
      .set({
        data: JSON.stringify(data),
        lastSectionIndex,
        updatedAt: now
      })
      .where(eq(schema.formSubmissions.id, existing.id))

    return { success: true, draftId: existing.id, isNew: false }
  } else {
    // Create new draft
    const draftId = nanoid()
    await db.insert(schema.formSubmissions).values({
      id: draftId,
      formId,
      status: 'draft',
      lastSectionIndex,
      actionItemId: actionItemId || null,
      clientJourneyId: clientJourneyId || null,
      matterId: matterId || null,
      submittedByUserId: user.id,
      submitterEmail: user.email,
      data: JSON.stringify(data),
      submittedAt: now,
      updatedAt: now
    })

    return { success: true, draftId, isNew: true }
  }
})
