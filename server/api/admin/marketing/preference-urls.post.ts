/**
 * POST /api/admin/marketing/preference-urls
 * Generate permanent preference URLs in bulk.
 * Accepts { personIds: string[] } or no body for all people with email.
 */

import { eq, isNotNull, inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { generatePermanentPreferenceToken } from '../../../utils/marketing-consent'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const personIds: string[] | undefined = body?.personIds

  const db = useDrizzle()

  // Build URL base from request host
  const host = getRequestHeader(event, 'host') || 'app.trustandlegacy.com'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  let people: { id: string, email: string | null }[]

  if (personIds && personIds.length > 0) {
    // Fetch specific people
    people = await db.select({ id: schema.people.id, email: schema.people.email })
      .from(schema.people)
      .where(inArray(schema.people.id, personIds))
  }
  else {
    // Fetch all people with email addresses
    people = await db.select({ id: schema.people.id, email: schema.people.email })
      .from(schema.people)
      .where(isNotNull(schema.people.email))
  }

  const urls: { personId: string, email: string | null, url: string }[] = []

  for (const person of people) {
    const token = await generatePermanentPreferenceToken(person.id)
    urls.push({
      personId: person.id,
      email: person.email,
      url: `${baseUrl}/preferences/${token}`
    })
  }

  return { urls, count: urls.length }
})
