/**
 * Authenticated form submission — used by journey action items and internal contexts.
 * Creates a formSubmission record and optionally marks an action item as complete.
 */
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

const submitSchema = z.object({
  data: z.record(z.any()),
  actionItemId: z.string().optional(),
  clientJourneyId: z.string().optional(),
  matterId: z.string().optional(),
  personFields: z.record(z.string()).optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF', 'CLIENT'])

  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const body = await readBody(event)
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid submission data' })
  }

  const { data, actionItemId, clientJourneyId, matterId, personFields } = parsed.data
  const db = useDrizzle()

  // Verify form exists
  const form = await db.select({ id: schema.forms.id, name: schema.forms.name })
    .from(schema.forms)
    .where(eq(schema.forms.id, formId))
    .get()

  if (!form) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  // Create form submission
  const submissionId = nanoid()
  const now = new Date()

  await db.insert(schema.formSubmissions).values({
    id: submissionId,
    formId,
    actionItemId: actionItemId || null,
    clientJourneyId: clientJourneyId || null,
    matterId: matterId || null,
    submittedByUserId: user.id,
    data: JSON.stringify(data),
    submitterEmail: user.email,
    submittedAt: now,
    updatedAt: now
  })

  // If linked to an action item, mark it as complete
  if (actionItemId) {
    await db.update(schema.actionItems)
      .set({
        status: 'COMPLETE',
        completedAt: now,
        completedBy: user.id,
        resourceId: submissionId,
        updatedAt: now
      })
      .where(eq(schema.actionItems.id, actionItemId))
  }

  await logActivity({
    type: 'FORM_SUBMITTED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'form', id: formId, name: form.name },
    event,
    details: { submissionId, actionItemId, clientJourneyId }
  })

  return { success: true, submissionId }
})
