/**
 * List form submissions with form name, submitter info, and context.
 * Supports filtering by formId, status, and date range.
 */
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const query = getQuery(event)
  const formId = query.formId as string | undefined
  const status = query.status as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const limit = Math.min(parseInt(query.limit as string || '50'), 200)
  const offset = parseInt(query.offset as string || '0')

  const db = useDrizzle()

  // Build conditions
  const conditions: any[] = []
  if (formId) conditions.push(eq(schema.formSubmissions.formId, formId))
  if (status === 'draft' || status === 'submitted') conditions.push(eq(schema.formSubmissions.status, status))
  if (startDate) conditions.push(gte(schema.formSubmissions.submittedAt, new Date(startDate)))
  if (endDate) conditions.push(lte(schema.formSubmissions.submittedAt, new Date(endDate)))

  // Count total
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(schema.formSubmissions)
  if (conditions.length > 0) countQuery = countQuery.where(and(...conditions)) as typeof countQuery
  const countResult = await countQuery.get()
  const total = countResult?.count ?? 0

  // Fetch submissions with form name and person name
  let baseQuery = db.select({
    id: schema.formSubmissions.id,
    formId: schema.formSubmissions.formId,
    formName: schema.forms.name,
    status: schema.formSubmissions.status,
    lastSectionIndex: schema.formSubmissions.lastSectionIndex,
    data: schema.formSubmissions.data,
    submitterEmail: schema.formSubmissions.submitterEmail,
    personId: schema.formSubmissions.personId,
    personFirstName: schema.people.firstName,
    personLastName: schema.people.lastName,
    submittedByUserId: schema.formSubmissions.submittedByUserId,
    publicBookingId: schema.formSubmissions.publicBookingId,
    actionItemId: schema.formSubmissions.actionItemId,
    clientJourneyId: schema.formSubmissions.clientJourneyId,
    matterId: schema.formSubmissions.matterId,
    utmSource: schema.formSubmissions.utmSource,
    utmMedium: schema.formSubmissions.utmMedium,
    utmCampaign: schema.formSubmissions.utmCampaign,
    submittedAt: schema.formSubmissions.submittedAt,
    updatedAt: schema.formSubmissions.updatedAt
  })
    .from(schema.formSubmissions)
    .innerJoin(schema.forms, eq(schema.formSubmissions.formId, schema.forms.id))
    .leftJoin(schema.people, eq(schema.formSubmissions.personId, schema.people.id))

  if (conditions.length > 0) baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery

  const submissions = await (baseQuery as any)
    .orderBy(desc(schema.formSubmissions.submittedAt))
    .limit(limit)
    .offset(offset)
    .all()

  return {
    submissions: submissions.map((s: any) => ({
      id: s.id,
      formId: s.formId,
      formName: s.formName,
      status: s.status,
      lastSectionIndex: s.lastSectionIndex,
      submitterEmail: s.submitterEmail,
      submitterName: s.personFirstName
        ? [s.personFirstName, s.personLastName].filter(Boolean).join(' ')
        : s.submitterEmail || 'Anonymous',
      personId: s.personId,
      context: s.publicBookingId ? 'booking'
        : s.actionItemId ? 'journey'
          : s.matterId ? 'matter'
            : 'standalone',
      utmSource: s.utmSource,
      utmMedium: s.utmMedium,
      utmCampaign: s.utmCampaign,
      submittedAt: s.submittedAt?.getTime?.() || s.submittedAt,
      updatedAt: s.updatedAt?.getTime?.() || s.updatedAt
    })),
    total,
    limit,
    offset
  }
})
