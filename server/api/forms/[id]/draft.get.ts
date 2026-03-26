/**
 * Load an existing draft for the authenticated user + form + optional context.
 */
import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF', 'CLIENT'])

  const formId = getRouterParam(event, 'id')
  if (!formId) throw createError({ statusCode: 400, message: 'Missing form ID' })

  const query = getQuery(event)
  const actionItemId = query.actionItemId as string | undefined
  const clientJourneyId = query.clientJourneyId as string | undefined

  const db = useDrizzle()

  // Find existing draft for this user + form + context
  let conditions = [
    eq(schema.formSubmissions.formId, formId),
    eq(schema.formSubmissions.status, 'draft'),
    eq(schema.formSubmissions.submittedByUserId, user.id)
  ]

  if (actionItemId) {
    conditions.push(eq(schema.formSubmissions.actionItemId, actionItemId))
  }
  if (clientJourneyId) {
    conditions.push(eq(schema.formSubmissions.clientJourneyId, clientJourneyId))
  }

  const draft = await db.select({
    id: schema.formSubmissions.id,
    data: schema.formSubmissions.data,
    lastSectionIndex: schema.formSubmissions.lastSectionIndex,
    updatedAt: schema.formSubmissions.updatedAt
  })
    .from(schema.formSubmissions)
    .where(and(...conditions))
    .orderBy(schema.formSubmissions.updatedAt)
    .limit(1)
    .get()

  if (!draft) {
    return { draft: null }
  }

  return {
    draft: {
      id: draft.id,
      data: JSON.parse(draft.data),
      lastSectionIndex: draft.lastSectionIndex,
      updatedAt: draft.updatedAt ? draft.updatedAt.getTime() : null
    }
  }
})
