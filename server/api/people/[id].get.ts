import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

// Get a specific person by ID
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const personId = getRouterParam(event, 'id')
  if (!personId) {
    throw createError({
      statusCode: 400,
      message: 'Person ID required'
    })
  }

  const db = useDrizzle()

  const person = await db.select().from(schema.people).where(eq(schema.people.id, personId)).get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Person not found'
    })
  }

  return {
    id: person.id,
    // camelCase (keep for backwards compatibility)
    firstName: person.firstName,
    lastName: person.lastName,
    middleNames: person.middleNames,
    fullName: person.fullName,
    email: person.email,
    phone: person.phone,
    address: person.address,
    city: person.city,
    state: person.state,
    zipCode: person.zipCode,
    dateOfBirth: person.dateOfBirth ? person.dateOfBirth.getTime() : null,
    ssnLast4: person.ssnLast4,
    notes: person.notes,
    createdAt: person.createdAt ? person.createdAt.getTime() : Date.now(),
    updatedAt: person.updatedAt ? person.updatedAt.getTime() : Date.now(),
    // snake_case versions for API compatibility
    first_name: person.firstName,
    last_name: person.lastName,
    middle_names: person.middleNames,
    full_name: person.fullName,
    zip_code: person.zipCode,
    date_of_birth: person.dateOfBirth ? person.dateOfBirth.getTime() : null,
    ssn_last_4: person.ssnLast4,
    created_at: person.createdAt ? person.createdAt.getTime() : Date.now(),
    updated_at: person.updatedAt ? person.updatedAt.getTime() : Date.now()
  }
})
