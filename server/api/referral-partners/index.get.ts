import { desc, asc, eq, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { parsePaginationParams, buildPaginationMeta, isPaginationRequested, calculateOffset } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'
  const usePagination = isPaginationRequested(query)
  const { page, limit, sortBy, sortDirection } = parsePaginationParams(query)

  const db = useDrizzle()

  // Build where clause
  const whereCondition = includeInactive ? undefined : eq(schema.referralPartners.isActive, true)

  // Get total count for pagination
  let totalCount = 0
  if (usePagination) {
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(schema.referralPartners)
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition) as typeof countQuery
    }
    const countResult = await countQuery.get()
    totalCount = countResult?.count ?? 0
  }

  // Build main query
  let partnersQuery = db.select().from(schema.referralPartners)

  if (whereCondition) {
    partnersQuery = partnersQuery.where(whereCondition) as typeof partnersQuery
  }

  // Apply sorting
  const sortColumn = sortBy === 'name' ? schema.referralPartners.name
    : sortBy === 'company' ? schema.referralPartners.company
    : sortBy === 'type' ? schema.referralPartners.type
    : sortBy === 'email' ? schema.referralPartners.email
    : sortBy === 'createdAt' ? schema.referralPartners.createdAt
    : sortBy === 'updatedAt' ? schema.referralPartners.updatedAt
    : schema.referralPartners.createdAt // default sort

  partnersQuery = partnersQuery.orderBy(
    sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
  ) as typeof partnersQuery

  // Apply pagination
  if (usePagination) {
    partnersQuery = partnersQuery
      .limit(limit)
      .offset(calculateOffset(page, limit)) as typeof partnersQuery
  }

  const partners = await partnersQuery.all()

  const partnersData = partners.map(partner => ({
    id: partner.id,
    name: partner.name,
    company: partner.company,
    type: partner.type,
    email: partner.email,
    phone: partner.phone,
    notes: partner.notes,
    isActive: partner.isActive,
    createdAt: partner.createdAt instanceof Date ? partner.createdAt.toISOString() : partner.createdAt,
    updatedAt: partner.updatedAt instanceof Date ? partner.updatedAt.toISOString() : partner.updatedAt
  }))

  // Return with pagination metadata if pagination was requested
  if (usePagination) {
    return {
      partners: partnersData,
      pagination: buildPaginationMeta(page, limit, totalCount)
    }
  }

  // Return raw array for backward compatibility
  return partnersData
})
