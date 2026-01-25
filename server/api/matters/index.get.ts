import { desc, asc, sql } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../db'
import { requireRole } from '../../utils/rbac'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

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

  // Build query with sorting
  let mattersQuery = db.select().from(schema.matters)

  // Apply sorting
  const sortColumn = sortBy === 'title' ? schema.matters.title
    : sortBy === 'status' ? schema.matters.status
    : sortBy === 'matterNumber' ? schema.matters.matterNumber
    : sortBy === 'createdAt' ? schema.matters.createdAt
    : sortBy === 'updatedAt' ? schema.matters.updatedAt
    : schema.matters.createdAt // default sort

  mattersQuery = mattersQuery.orderBy(
    sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
  ) as typeof mattersQuery

  // Apply pagination
  if (usePagination) {
    mattersQuery = mattersQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof mattersQuery
  }

  const matters = await mattersQuery.all()

  // Convert to snake_case for API compatibility
  const mattersData = matters.map(matter => ({
    id: matter.id,
    client_id: matter.clientId,
    title: matter.title,
    matter_number: matter.matterNumber,
    description: matter.description,
    status: matter.status,
    lead_attorney_id: matter.leadAttorneyId,
    engagement_journey_id: matter.engagementJourneyId,
    created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
    updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt
  }))

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
