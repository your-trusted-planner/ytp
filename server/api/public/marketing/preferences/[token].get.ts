import { eq } from 'drizzle-orm'
import { verifyPreferenceToken, getPersonConsent } from '../../../../utils/marketing-consent'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Missing token' })

  const personId = await verifyPreferenceToken(token)
  if (!personId) {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  const db = useDrizzle()
  const person = await db.select({
    firstName: schema.people.firstName,
    lastName: schema.people.lastName
  })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  const consent = await getPersonConsent(personId)

  return {
    firstName: person.firstName,
    lastName: person.lastName,
    consent
  }
})
