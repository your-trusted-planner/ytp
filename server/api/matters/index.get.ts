import { desc, asc, sql, eq } from 'drizzle-orm'
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

  // Get total count for pagination
  let totalCount = 0
  if (usePagination) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.matters)
      .get()
    totalCount = countResult?.count ?? 0
  }

  // Build query with join to get client names
  const sortColumn = sortBy === 'title' ? schema.matters.title
    : sortBy === 'status' ? schema.matters.status
    : sortBy === 'matterNumber' ? schema.matters.matterNumber
    : sortBy === 'createdAt' ? schema.matters.createdAt
    : sortBy === 'updatedAt' ? schema.matters.updatedAt
    : schema.matters.createdAt // default sort

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
    .orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))

  // Apply pagination
  if (usePagination) {
    mattersQuery = mattersQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof mattersQuery
  }

  const matters = await mattersQuery.all()

  // Convert to API format with client names
  const mattersData = matters.map(matter => {
    // Build client name from available fields
    const clientName = matter.clientFullName
      || (matter.clientFirstName && matter.clientLastName
        ? `${matter.clientFirstName} ${matter.clientLastName}`
        : matter.clientFirstName || matter.clientLastName || '')

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

  // Return raw array for backward compatibility
  return mattersData
})
