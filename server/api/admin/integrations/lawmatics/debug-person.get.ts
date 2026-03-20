/**
 * GET /api/admin/integrations/lawmatics/debug-person
 *
 * Diagnostic endpoint: looks up a person by name in our DB and returns
 * all address, phone, and country fields for verifying import correctness.
 *
 * Query params:
 *   name - search string (matches against fullName)
 *   id   - person ID (exact match, takes priority over name)
 */

import { eq, like, or } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const name = query.name as string | undefined
  const id = query.id as string | undefined

  if (!name && !id) {
    throw createError({ statusCode: 400, message: 'Provide ?name= or ?id= parameter' })
  }

  const db = useDrizzle()

  let people
  if (id) {
    people = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, id))
      .all()
  }
  else {
    people = await db.select()
      .from(schema.people)
      .where(or(
        like(schema.people.fullName, `%${name}%`),
        like(schema.people.firstName, `%${name}%`),
        like(schema.people.lastName, `%${name}%`)
      ))
      .all()
  }

  if (people.length === 0) {
    return { found: 0, message: 'No matching people found' }
  }

  return {
    found: people.length,
    people: people.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      address2: p.address2,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      country: p.country,
      dateOfBirth: p.dateOfBirth,
      importMetadata: p.importMetadata ? JSON.parse(p.importMetadata) : null
    }))
  }
})
