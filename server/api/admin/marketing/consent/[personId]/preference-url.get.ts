/**
 * GET /api/admin/marketing/consent/:personId/preference-url
 * Generate a permanent preference URL for a person.
 * Returns a non-expiring, deterministic URL suitable for syncing to external systems.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../../db'
import { generatePermanentPreferenceToken } from '../../../../../utils/marketing-consent'

export default defineEventHandler(async (event) => {
  const personId = getRouterParam(event, 'personId')

  if (!personId) {
    throw createError({ statusCode: 400, message: 'Person ID is required' })
  }

  const db = useDrizzle()

  // Verify person exists
  const person = await db.select({ id: schema.people.id })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  const token = await generatePermanentPreferenceToken(personId)

  // Build URL from request host
  const host = getRequestHeader(event, 'host') || 'app.trustandlegacy.com'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const url = `${protocol}://${host}/preferences/${token}`

  return { url, token }
})
