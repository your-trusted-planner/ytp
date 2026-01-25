import { like, or, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

// Get all people (with optional search)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const search = query.search as string | undefined

  const db = useDrizzle()

  let peopleQuery = db.select().from(schema.people)

  if (search) {
    const searchPattern = `%${search}%`
    peopleQuery = peopleQuery.where(
      or(
        like(schema.people.fullName, searchPattern),
        like(schema.people.email, searchPattern),
        like(schema.people.phone, searchPattern)
      )
    )
  }

  const people = await peopleQuery.orderBy(asc(schema.people.fullName)).all()

  return {
    people: people.map((p) => ({
      id: p.id,
      // camelCase (keep for backwards compatibility)
      firstName: p.firstName,
      lastName: p.lastName,
      middleNames: p.middleNames,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.getTime() : null,
      ssnLast4: p.ssnLast4,
      notes: p.notes,
      createdAt: p.createdAt ? p.createdAt.getTime() : Date.now(),
      updatedAt: p.updatedAt ? p.updatedAt.getTime() : Date.now(),
      // snake_case versions for API compatibility
      first_name: p.firstName,
      last_name: p.lastName,
      middle_names: p.middleNames,
      full_name: p.fullName,
      zip_code: p.zipCode,
      date_of_birth: p.dateOfBirth ? p.dateOfBirth.getTime() : null,
      ssn_last_4: p.ssnLast4,
      created_at: p.createdAt ? p.createdAt.getTime() : Date.now(),
      updated_at: p.updatedAt ? p.updatedAt.getTime() : Date.now()
    }))
  }
})
