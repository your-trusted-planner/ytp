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

  // Build base query for clients
  let clientsQuery = db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      phone: schema.users.phone,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
      profile: schema.clientProfiles
    })
    .from(schema.users)
    .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
    .where(eq(schema.users.role, 'CLIENT'))

  // Apply sorting
  const sortColumn = sortBy === 'firstName' ? schema.users.firstName
    : sortBy === 'lastName' ? schema.users.lastName
    : sortBy === 'email' ? schema.users.email
    : sortBy === 'status' ? schema.users.status
    : sortBy === 'createdAt' ? schema.users.createdAt
    : sortBy === 'updatedAt' ? schema.users.updatedAt
    : schema.users.createdAt // default sort

  clientsQuery = clientsQuery.orderBy(
    sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
  ) as typeof clientsQuery

  // Get total count for pagination (only if pagination requested)
  let totalCount = 0
  if (usePagination) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.role, 'CLIENT'))
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
    email: client.email,
    first_name: client.firstName,
    last_name: client.lastName,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    status: client.status,
    createdAt: client.createdAt instanceof Date ? client.createdAt.getTime() : client.createdAt,
    updatedAt: client.updatedAt instanceof Date ? client.updatedAt.getTime() : client.updatedAt,
    profile: client.profile ? {
      id: client.profile.id,
      user_id: client.profile.userId,
      date_of_birth: client.profile.dateOfBirth instanceof Date ? client.profile.dateOfBirth.getTime() : client.profile.dateOfBirth,
      address: client.profile.address,
      city: client.profile.city,
      state: client.profile.state,
      zip_code: client.profile.zipCode,
      has_minor_children: client.profile.hasMinorChildren ? 1 : 0,
      children_info: client.profile.childrenInfo,
      business_name: client.profile.businessName,
      business_type: client.profile.businessType,
      has_will: client.profile.hasWill ? 1 : 0,
      has_trust: client.profile.hasTrust ? 1 : 0,
      last_updated: client.profile.lastUpdated instanceof Date ? client.profile.lastUpdated.getTime() : client.profile.lastUpdated,
      assigned_lawyer_id: client.profile.assignedLawyerId,
      created_at: client.profile.createdAt instanceof Date ? client.profile.createdAt.getTime() : client.profile.createdAt,
      updated_at: client.profile.updatedAt instanceof Date ? client.profile.updatedAt.getTime() : client.profile.updatedAt
    } : null
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
