/**
 * GET /api/estate-plans
 *
 * List all estate plans with optional filtering and pagination.
 */

import { useDrizzle, schema } from '../../db'
import { eq, desc, asc, or, like, and, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = Math.min(parseInt(query.limit as string) || 25, 100)
  const status = query.status as string | undefined
  const planType = query.planType as string | undefined
  const search = query.search as string | undefined
  const sortBy = (query.sortBy as string) || 'updatedAt'
  const sortDirection = (query.sortDirection as string) || 'desc'

  const db = useDrizzle()

  // Build where conditions
  const conditions = []

  if (status && status !== 'all') {
    conditions.push(eq(schema.estatePlans.status, status as any))
  }

  if (planType) {
    conditions.push(eq(schema.estatePlans.planType, planType as any))
  }

  // Search in plan name and linked person names
  if (search) {
    conditions.push(
      or(
        like(schema.estatePlans.planName, `%${search}%`),
        like(schema.people.fullName, `%${search}%`)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const countResult = await db.select({ count: count() })
    .from(schema.estatePlans)
    .leftJoin(schema.people, eq(schema.estatePlans.grantorPersonId1, schema.people.id))
    .where(whereClause)

  const total = countResult[0]?.count || 0

  // Get plans with joined person data
  const orderByColumn = sortBy === 'planName' ? schema.estatePlans.planName :
                        sortBy === 'effectiveDate' ? schema.estatePlans.effectiveDate :
                        sortBy === 'status' ? schema.estatePlans.status :
                        sortBy === 'createdAt' ? schema.estatePlans.createdAt :
                        schema.estatePlans.updatedAt

  const orderFn = sortDirection === 'asc' ? asc : desc

  const plans = await db.select({
    plan: schema.estatePlans,
    grantor1: schema.people
  })
    .from(schema.estatePlans)
    .leftJoin(schema.people, eq(schema.estatePlans.grantorPersonId1, schema.people.id))
    .where(whereClause)
    .orderBy(orderFn(orderByColumn))
    .limit(limit)
    .offset((page - 1) * limit)

  // Get second grantor data if present
  const planIds = plans.map(p => p.plan.id)
  const grantor2Ids = plans
    .filter(p => p.plan.grantorPersonId2)
    .map(p => p.plan.grantorPersonId2!)

  let grantor2Map = new Map<string, any>()
  if (grantor2Ids.length > 0) {
    const grantor2People = await db.select()
      .from(schema.people)
      .where(or(...grantor2Ids.map(id => eq(schema.people.id, id))))

    for (const person of grantor2People) {
      grantor2Map.set(person.id, person)
    }
  }

  // Get role counts per plan by category
  const roleCountMap = new Map<string, Record<string, number>>()

  if (planIds.length > 0) {
    const roleCounts = await db.select({
      planId: schema.planRoles.planId,
      roleCategory: schema.planRoles.roleCategory,
      count: count()
    })
      .from(schema.planRoles)
      .where(and(
        or(...planIds.map(id => eq(schema.planRoles.planId, id))),
        eq(schema.planRoles.status, 'ACTIVE')
      ))
      .groupBy(schema.planRoles.planId, schema.planRoles.roleCategory)

    // Build a map of planId -> { category -> count }
    for (const rc of roleCounts) {
      if (!roleCountMap.has(rc.planId)) {
        roleCountMap.set(rc.planId, {})
      }
      const planCounts = roleCountMap.get(rc.planId)!
      planCounts[rc.roleCategory || 'OTHER'] = rc.count
    }
  }

  // Format response
  const formattedPlans = plans.map(({ plan, grantor1 }) => ({
    id: plan.id,
    planType: plan.planType,
    planName: plan.planName,
    currentVersion: plan.currentVersion,
    status: plan.status,
    effectiveDate: plan.effectiveDate,
    lastAmendedAt: plan.lastAmendedAt,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    grantor1: grantor1 ? {
      id: grantor1.id,
      fullName: grantor1.fullName,
      firstName: grantor1.firstName,
      lastName: grantor1.lastName,
      email: grantor1.email
    } : null,
    grantor2: plan.grantorPersonId2 ? (() => {
      const g2 = grantor2Map.get(plan.grantorPersonId2)
      return g2 ? {
        id: g2.id,
        fullName: g2.fullName,
        firstName: g2.firstName,
        lastName: g2.lastName,
        email: g2.email
      } : null
    })() : null,
    roleCounts: roleCountMap.get(plan.id) || {}
  }))

  return {
    plans: formattedPlans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
