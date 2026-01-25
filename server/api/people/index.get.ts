import { like, or, asc, desc, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

// Get all people (with optional search and pagination)
export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const search = query.search as string | undefined
  const usePagination = isPaginationRequested(query)
  const { page, limit, sortBy, sortDirection } = parsePaginationParams(query)

  const db = useDrizzle()

  // Build where clause for search
  const searchCondition = search
    ? or(
        like(schema.people.fullName, `%${search}%`),
        like(schema.people.email, `%${search}%`),
        like(schema.people.phone, `%${search}%`)
      )
    : undefined

  // Get total count for pagination
  let totalCount = 0
  if (usePagination) {
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(schema.people)
    if (searchCondition) {
      countQuery = countQuery.where(searchCondition) as typeof countQuery
    }
    const countResult = await countQuery.get()
    totalCount = countResult?.count ?? 0
  }

  // Build main query
  let peopleQuery = db.select().from(schema.people)

  if (searchCondition) {
    peopleQuery = peopleQuery.where(searchCondition) as typeof peopleQuery
  }

  // Apply sorting
  const sortColumn = sortBy === 'firstName' ? schema.people.firstName
    : sortBy === 'lastName' ? schema.people.lastName
    : sortBy === 'email' ? schema.people.email
    : sortBy === 'phone' ? schema.people.phone
    : sortBy === 'createdAt' ? schema.people.createdAt
    : sortBy === 'updatedAt' ? schema.people.updatedAt
    : schema.people.fullName // default sort

  peopleQuery = peopleQuery.orderBy(
    sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn)
  ) as typeof peopleQuery

  // Apply pagination
  if (usePagination) {
    peopleQuery = peopleQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof peopleQuery
  }

  const people = await peopleQuery.all()

  const result = {
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

  // Add pagination metadata if pagination was requested
  if (usePagination) {
    return {
      ...result,
      pagination: buildPaginationMeta(page, limit, totalCount)
    }
  }

  return result
})
