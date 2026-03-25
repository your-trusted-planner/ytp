/**
 * Public form submission — no auth required.
 * Creates a formSubmission record, optionally creates/matches a person from field mappings.
 */
import { z } from 'zod'
import { eq, and, asc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../../db'
import { logActivity } from '../../../../utils/activity-logger'

const submitSchema = z.object({
  responses: z.record(z.any()),
  personFields: z.record(z.string()).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Missing form slug' })

  const body = await readBody(event)
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid submission data' })
  }

  const { responses, personFields, utmSource, utmMedium, utmCampaign } = parsed.data
  const db = useDrizzle()

  // Verify form exists and is active
  const form = await db.select({ id: schema.forms.id, name: schema.forms.name })
    .from(schema.forms)
    .where(and(eq(schema.forms.slug, slug), eq(schema.forms.isActive, true), eq(schema.forms.isPublic, true)))
    .get()

  if (!form) {
    throw createError({ statusCode: 404, message: 'Form not found' })
  }

  // Person lookup/creation from field mappings
  let personId: string | null = null
  const email = personFields?.email || null

  if (personFields && (personFields.firstName || personFields.email)) {
    const { findDuplicates } = await import('../../../../utils/record-matcher')

    const matches = await findDuplicates({
      firstName: personFields.firstName,
      lastName: personFields.lastName,
      email: personFields.email,
      phone: personFields.phone
    })

    const highMatch = matches.find(m => m.confidence === 'high')
    if (highMatch) {
      personId = highMatch.personId
    } else {
      personId = nanoid()
      const fullName = [personFields.firstName, personFields.lastName].filter(Boolean).join(' ')

      await db.insert(schema.people).values({
        id: personId,
        firstName: personFields.firstName || null,
        lastName: personFields.lastName || null,
        fullName: fullName || null,
        email: personFields.email || null,
        phone: personFields.phone || null,
        address: personFields.address || null,
        city: personFields.city || null,
        state: personFields.state || null,
        zipCode: personFields.zipCode || null,
        country: personFields.country || null,
        maritalStatus: personFields.maritalStatus || null
      })
    }
  }

  // Create submission
  const submissionId = nanoid()
  const now = new Date()

  await db.insert(schema.formSubmissions).values({
    id: submissionId,
    formId: form.id,
    personId,
    data: JSON.stringify(responses),
    submitterEmail: email,
    utmSource: utmSource || null,
    utmMedium: utmMedium || null,
    utmCampaign: utmCampaign || null,
    submittedAt: now,
    updatedAt: now
  })

  // Log activity (use a system user ID since this is public)
  await logActivity({
    type: 'FORM_SUBMITTED',
    userId: 'system',
    target: { type: 'form', id: form.id, name: form.name },
    event,
    details: { submissionId, personId, source: 'public' }
  })

  // Return success message from form settings if configured
  const formFull = await db.select({ settings: schema.forms.settings })
    .from(schema.forms)
    .where(eq(schema.forms.id, form.id))
    .get()

  let successMessage = 'Thank you! Your response has been submitted.'
  if (formFull?.settings) {
    try {
      const settings = JSON.parse(formFull.settings)
      if (settings.successMessage) successMessage = settings.successMessage
    } catch { /* ignore */ }
  }

  return {
    success: true,
    submissionId,
    message: successMessage
  }
})
