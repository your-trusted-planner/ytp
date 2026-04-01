import { eq, sql, asc, desc, and, or, like } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { requireRole } from '../../utils/rbac'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const db = useDrizzle()
  const query = getQuery(event)
  const usePagination = isPaginationRequested(query)
  const { page, limit, sortBy, sortDirection } = parsePaginationParams(query)

  // Status filter
  const statusFilter = typeof query.status === 'string' ? query.status.toUpperCase() : null
  const validStatuses = ['PROSPECTIVE', 'ACTIVE', 'FORMER']
  const status = statusFilter && validStatuses.includes(statusFilter) ? statusFilter : null

  // Search filter (searches first name, last name, full name, email)
  const search = typeof query.search === 'string' ? query.search.trim() : null

  // Build base query for clients using the clients_with_status view (derives status from matters)
  // Join with people table to get name/email data
  let clientsQuery = db
    .select({
      id: schema.clientsWithStatus.id,
      personId: schema.clientsWithStatus.personId,
      status: schema.clientsWithStatus.status,
      hasMinorChildren: schema.clientsWithStatus.hasMinorChildren,
      childrenInfo: schema.clientsWithStatus.childrenInfo,
      hasTrust: schema.clientsWithStatus.hasTrust,
      hasWill: schema.clientsWithStatus.hasWill,
      createdAt: schema.clientsWithStatus.createdAt,
      updatedAt: schema.clientsWithStatus.updatedAt,
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
    .from(schema.clientsWithStatus)
    .innerJoin(schema.people, eq(schema.clientsWithStatus.personId, schema.people.id))

  // Build WHERE conditions
  const conditions = []
  if (status) {
    conditions.push(eq(schema.clientsWithStatus.status, status))
  }
  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        like(schema.people.firstName, pattern),
        like(schema.people.lastName, pattern),
        like(schema.people.fullName, pattern),
        like(schema.people.email, pattern)
      )!
    )
  }
  if (conditions.length > 0) {
    clientsQuery = clientsQuery.where(and(...conditions)) as typeof clientsQuery
  }

  // Apply sorting - use people table for name/email fields
  const sortColumn = sortBy === 'firstName' ?
    schema.people.firstName :
    sortBy === 'lastName' ?
      schema.people.lastName :
      sortBy === 'email' ?
        schema.people.email :
        sortBy === 'status' ?
          schema.clientsWithStatus.status :
          sortBy === 'createdAt' ?
            schema.clientsWithStatus.createdAt :
            sortBy === 'updatedAt' ?
              schema.clientsWithStatus.updatedAt :
              schema.clientsWithStatus.createdAt // default sort

  clientsQuery = clientsQuery.orderBy(
    sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
  ) as typeof clientsQuery

  // Get total count for pagination (only if pagination requested)
  let totalCount = 0
  if (usePagination) {
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.clientsWithStatus)
      .innerJoin(schema.people, eq(schema.clientsWithStatus.personId, schema.people.id))

    // Apply same filters to count query
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery
    }

    const countResult = await countQuery.get()
    totalCount = countResult?.count ?? 0

    // Apply pagination
    clientsQuery = clientsQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof clientsQuery
  }

  const clientsData = await clientsQuery.all()

  // Transform to match frontend expectations
  // Batch resolve userIds for impersonation (find CLIENT user accounts by personId)
  const personIds = clientsData.map(c => c.personId).filter(Boolean) as string[]
  const userMap = new Map<string, string>()
  if (personIds.length > 0) {
    const { inArray } = await import('drizzle-orm')
    const clientUsers = await db.select({ id: schema.users.id, personId: schema.users.personId })
      .from(schema.users)
      .where(and(
        inArray(schema.users.personId, personIds),
        eq(schema.users.role, 'CLIENT')
      ))
      .all()
    for (const u of clientUsers) {
      if (u.personId) userMap.set(u.personId, u.id)
    }
  }

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
    userId: client.personId ? userMap.get(client.personId) || null : null,
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
