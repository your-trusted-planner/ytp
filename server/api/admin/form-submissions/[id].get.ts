/**
 * Get a single form submission with its form definition for rendering responses.
 */
import { eq, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing submission ID' })

  const db = useDrizzle()

  const submission = await db.select({
    id: schema.formSubmissions.id,
    formId: schema.formSubmissions.formId,
    status: schema.formSubmissions.status,
    data: schema.formSubmissions.data,
    submitterEmail: schema.formSubmissions.submitterEmail,
    personId: schema.formSubmissions.personId,
    publicBookingId: schema.formSubmissions.publicBookingId,
    actionItemId: schema.formSubmissions.actionItemId,
    clientJourneyId: schema.formSubmissions.clientJourneyId,
    matterId: schema.formSubmissions.matterId,
    attorneyNotes: schema.formSubmissions.attorneyNotes,
    utmSource: schema.formSubmissions.utmSource,
    utmMedium: schema.formSubmissions.utmMedium,
    utmCampaign: schema.formSubmissions.utmCampaign,
    submittedAt: schema.formSubmissions.submittedAt,
    updatedAt: schema.formSubmissions.updatedAt,
    formName: schema.forms.name,
    personFirstName: schema.people.firstName,
    personLastName: schema.people.lastName,
    personEmail: schema.people.email
  })
    .from(schema.formSubmissions)
    .innerJoin(schema.forms, eq(schema.formSubmissions.formId, schema.forms.id))
    .leftJoin(schema.people, eq(schema.formSubmissions.personId, schema.people.id))
    .where(eq(schema.formSubmissions.id, id))
    .get()

  if (!submission) {
    throw createError({ statusCode: 404, message: 'Submission not found' })
  }

  // Fetch form fields for label rendering
  const fields = await db.select({
    id: schema.formFields.id,
    label: schema.formFields.label,
    fieldType: schema.formFields.fieldType,
    sectionId: schema.formFields.sectionId,
    fieldOrder: schema.formFields.fieldOrder,
    config: schema.formFields.config
  })
    .from(schema.formFields)
    .where(eq(schema.formFields.formId, submission.formId))
    .orderBy(asc(schema.formFields.fieldOrder))
    .all()

  // Fetch sections for grouping
  const sections = await db.select({
    id: schema.formSections.id,
    title: schema.formSections.title,
    sectionOrder: schema.formSections.sectionOrder
  })
    .from(schema.formSections)
    .where(eq(schema.formSections.formId, submission.formId))
    .orderBy(asc(schema.formSections.sectionOrder))
    .all()

  const responseData = JSON.parse(submission.data)

  return {
    submission: {
      id: submission.id,
      formId: submission.formId,
      formName: submission.formName,
      status: submission.status,
      submitterEmail: submission.submitterEmail,
      submitterName: submission.personFirstName
        ? [submission.personFirstName, submission.personLastName].filter(Boolean).join(' ')
        : submission.submitterEmail || 'Anonymous',
      personId: submission.personId,
      personEmail: submission.personEmail,
      context: submission.publicBookingId ? 'booking'
        : submission.actionItemId ? 'journey'
          : submission.matterId ? 'matter'
            : 'standalone',
      attorneyNotes: submission.attorneyNotes,
      utmSource: submission.utmSource,
      utmMedium: submission.utmMedium,
      utmCampaign: submission.utmCampaign,
      submittedAt: submission.submittedAt?.getTime?.() || submission.submittedAt,
      updatedAt: submission.updatedAt?.getTime?.() || submission.updatedAt
    },
    // Responses organized by section with field labels
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      fields: fields
        .filter(f => f.sectionId === s.id)
        .filter(f => f.fieldType !== 'content') // Skip content blocks in response view
        .map(f => ({
          id: f.id,
          label: f.label,
          fieldType: f.fieldType,
          value: responseData[f.id] ?? null,
          config: f.config ? JSON.parse(f.config) : null
        }))
    }))
  }
})
