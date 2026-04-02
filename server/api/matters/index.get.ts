import { desc, asc, sql, eq, or, like, and } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { requireRole } from '../../utils/rbac'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  // Real database check only - mock support to be added if needed
  if (!isDatabaseAvailable()) {
    return []
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const query = getQuery(event)
  const usePagination = isPaginationRequested(query)
  const { page, limit, sortBy, sortDirection } = parsePaginationParams(query)

  // Client filter (for AppointmentModal matter select)
  const clientId = typeof query.clientId === 'string' ? query.clientId : null

  // Search filter (searches title, matter number, client name)
  const search = typeof query.search === 'string' ? query.search.trim() : null

  // Build WHERE conditions shared between count and data queries
  const conditions = []
  if (clientId) {
    conditions.push(eq(schema.matters.clientId, clientId))
  }
  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        like(schema.matters.title, pattern),
        like(schema.matters.matterNumber, pattern),
        like(schema.people.firstName, pattern),
        like(schema.people.lastName, pattern),
        like(schema.people.fullName, pattern)
      )!
    )
  }

  // Get total count for pagination
  let totalCount = 0
  if (usePagination) {
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.matters)
      .leftJoin(schema.users, eq(schema.matters.clientId, schema.users.id))
      .leftJoin(schema.people, eq(schema.users.personId, schema.people.id))
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery
    }
    const countResult = await countQuery.get()
    totalCount = countResult?.count ?? 0
  }

  // Build query with join to get client names
  const sortColumn = sortBy === 'title' ?
    schema.matters.title :
    sortBy === 'status' ?
      schema.matters.status :
      sortBy === 'matterNumber' ?
        schema.matters.matterNumber :
        sortBy === 'createdAt' ?
          schema.matters.createdAt :
          sortBy === 'updatedAt' ?
            schema.matters.updatedAt :
            schema.matters.createdAt // default sort

  // Note: matters.clientId references users.id (legacy), not clients.id
  // Join through users -> people to get client name
  // Use selectDistinct to avoid duplicates from JOINs
  let mattersQuery = db
    .selectDistinct({
      id: schema.matters.id,
      clientId: schema.matters.clientId,
      title: schema.matters.title,
      matterNumber: schema.matters.matterNumber,
      description: schema.matters.description,
      status: schema.matters.status,
      leadAttorneyId: schema.matters.leadAttorneyId,
      engagementJourneyId: schema.matters.engagementJourneyId,
      createdAt: schema.matters.createdAt,
      updatedAt: schema.matters.updatedAt,
      // Client name from users -> people join
      clientFirstName: schema.people.firstName,
      clientLastName: schema.people.lastName,
      clientFullName: schema.people.fullName
    })
    .from(schema.matters)
    .leftJoin(schema.users, eq(schema.matters.clientId, schema.users.id))
    .leftJoin(schema.people, eq(schema.users.personId, schema.people.id))

  // Apply filters
  if (conditions.length > 0) {
    mattersQuery = mattersQuery.where(and(...conditions)) as typeof mattersQuery
  }

  mattersQuery = mattersQuery.orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)) as typeof mattersQuery

  // Apply pagination
  if (usePagination) {
    mattersQuery = mattersQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof mattersQuery
  }

  const matters = await mattersQuery.all()

  // Convert to API format with client names
  const mattersData = matters.map((matter) => {
    // Build client name from available fields
    const clientName = matter.clientFullName ||
      (matter.clientFirstName && matter.clientLastName ?
        `${matter.clientFirstName} ${matter.clientLastName}` :
        matter.clientFirstName || matter.clientLastName || '')

    return {
      id: matter.id,
      clientId: matter.clientId,
      client_id: matter.clientId,
      title: matter.title,
      matterNumber: matter.matterNumber,
      matter_number: matter.matterNumber,
      description: matter.description,
      status: matter.status,
      leadAttorneyId: matter.leadAttorneyId,
      lead_attorney_id: matter.leadAttorneyId,
      engagementJourneyId: matter.engagementJourneyId,
      engagement_journey_id: matter.engagementJourneyId,
      clientName,
      client_name: clientName,
      createdAt: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
      created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
      updatedAt: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt,
      updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt
    }
  })

  // Return with pagination metadata if pagination was requested
  if (usePagination) {
    return {
      matters: mattersData,
      pagination: buildPaginationMeta(page, limit, totalCount)
    }
  }

  // When search is used, return wrapped format for consistency
  if (search) {
    return { matters: mattersData }
  }

  // Return raw array for backward compatibility
  return mattersData
})
