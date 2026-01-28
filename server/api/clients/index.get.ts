import { eq, sql, asc, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { requireRole } from '../../utils/rbac'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const db = useDrizzle()
  const query = getQuery(event)
  const usePagination = isPaginationRequested(query)
  const { page, limit, sortBy, sortDirection } = parsePaginationParams(query)

  // Build base query for clients using the clients table (Belly Button Principle)
  // Join with people table to get name/email data
  let clientsQuery = db
    .select({
      id: schema.clients.id,
      personId: schema.clients.personId,
      status: schema.clients.status,
      hasMinorChildren: schema.clients.hasMinorChildren,
      childrenInfo: schema.clients.childrenInfo,
      hasTrust: schema.clients.hasTrust,
      hasWill: schema.clients.hasWill,
      createdAt: schema.clients.createdAt,
      updatedAt: schema.clients.updatedAt,
      // Person data
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      fullName: schema.people.fullName,
      email: schema.people.email,
      phone: schema.people.phone,
      address: schema.people.address,
      city: schema.people.city,
      state: schema.people.state,
      zipCode: schema.people.zipCode,
      dateOfBirth: schema.people.dateOfBirth
    })
    .from(schema.clients)
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))

  // Apply sorting - use people table for name/email fields
  const sortColumn = sortBy === 'firstName' ? schema.people.firstName
    : sortBy === 'lastName' ? schema.people.lastName
    : sortBy === 'email' ? schema.people.email
    : sortBy === 'status' ? schema.clients.status
    : sortBy === 'createdAt' ? schema.clients.createdAt
    : sortBy === 'updatedAt' ? schema.clients.updatedAt
    : schema.clients.createdAt // default sort

  clientsQuery = clientsQuery.orderBy(
    sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
  ) as typeof clientsQuery

  // Get total count for pagination (only if pagination requested)
  let totalCount = 0
  if (usePagination) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.clients)
      .get()
    totalCount = countResult?.count ?? 0

    // Apply pagination
    clientsQuery = clientsQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof clientsQuery
  }

  const clientsData = await clientsQuery.all()

  // Transform to match frontend expectations
  const clients = clientsData.map(client => ({
    id: client.id,
    personId: client.personId,
    email: client.email,
    first_name: client.firstName,
    last_name: client.lastName,
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: client.fullName,
    phone: client.phone,
    status: client.status,
    createdAt: client.createdAt instanceof Date ? client.createdAt.getTime() : client.createdAt,
    updatedAt: client.updatedAt instanceof Date ? client.updatedAt.getTime() : client.updatedAt,
    // Inline profile data from clients table (replaces separate clientProfiles join)
    profile: {
      address: client.address,
      city: client.city,
      state: client.state,
      zip_code: client.zipCode,
      date_of_birth: client.dateOfBirth instanceof Date ? client.dateOfBirth.getTime() : client.dateOfBirth,
      has_minor_children: client.hasMinorChildren ? 1 : 0,
      children_info: client.childrenInfo,
      has_will: client.hasWill ? 1 : 0,
      has_trust: client.hasTrust ? 1 : 0
    }
  }))

  // Return with pagination metadata if pagination was requested
  if (usePagination) {
    return {
      clients,
      pagination: buildPaginationMeta(page, limit, totalCount)
    }
  }

  return { clients }
})
