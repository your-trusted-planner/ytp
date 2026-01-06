import { like, or, asc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

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
        like(schema.people.entityName, searchPattern)
      )
    )
  }

  const people = await peopleQuery.orderBy(asc(schema.people.fullName)).all()

  return {
    people: people.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      middleNames: p.middleNames, // Already deserialized by jsonArray custom type!
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.getTime() : null,
      ssnLast4: p.ssnLast4,
      entityName: p.entityName,
      entityType: p.entityType,
      entityEin: p.entityEin,
      notes: p.notes,
      createdAt: p.createdAt ? p.createdAt.getTime() : Date.now(),
      updatedAt: p.updatedAt ? p.updatedAt.getTime() : Date.now()
    }))
  }
})
