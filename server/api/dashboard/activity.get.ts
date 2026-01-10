import { desc, eq, and, gte, lte, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])

  const query = getQuery(event)

  // Parse query parameters
  const limit = Math.min(Math.max(parseInt(query.limit as string) || 20, 1), 100)
  const offset = Math.max(parseInt(query.offset as string) || 0, 0)
  const type = query.type as string | undefined
  const targetType = query.targetType as string | undefined
  const targetId = query.targetId as string | undefined
  const userId = query.userId as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined

  const db = useDrizzle()

  // Build filter conditions
  const conditions = []

  if (type) {
    conditions.push(eq(schema.activities.type, type))
  }
  if (targetType) {
    conditions.push(eq(schema.activities.targetType, targetType))
  }
  if (targetId) {
    conditions.push(eq(schema.activities.targetId, targetId))
  }
  if (userId) {
    conditions.push(eq(schema.activities.userId, userId))
  }
  if (startDate) {
    const start = new Date(startDate)
    if (!isNaN(start.getTime())) {
      conditions.push(gte(schema.activities.createdAt, start))
    }
  }
  if (endDate) {
    const end = new Date(endDate)
    if (!isNaN(end.getTime())) {
      conditions.push(lte(schema.activities.createdAt, end))
    }
  }

  // Query activities with user join
  const activities = await db
    .select({
      id: schema.activities.id,
      type: schema.activities.type,
      description: schema.activities.description,
      metadata: schema.activities.metadata,
      userId: schema.activities.userId,
      userRole: schema.activities.userRole,
      targetType: schema.activities.targetType,
      targetId: schema.activities.targetId,
      journeyId: schema.activities.journeyId,
      matterId: schema.activities.matterId,
      ipAddress: schema.activities.ipAddress,
      country: schema.activities.country,
      city: schema.activities.city,
      createdAt: schema.activities.createdAt,
      // User details
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userEmail: schema.users.email
    })
    .from(schema.activities)
    .leftJoin(schema.users, eq(schema.activities.userId, schema.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.activities.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.activities)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .get()

  const total = countResult?.count || 0

  return {
    activities: activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
      userId: activity.userId,
      userRole: activity.userRole,
      targetType: activity.targetType,
      targetId: activity.targetId,
      journeyId: activity.journeyId,
      matterId: activity.matterId,
      ipAddress: activity.ipAddress,
      country: activity.country,
      city: activity.city,
      createdAt: activity.createdAt instanceof Date ? activity.createdAt.toISOString() : activity.createdAt,
      user: activity.userFirstName ? {
        firstName: activity.userFirstName,
        lastName: activity.userLastName,
        email: activity.userEmail
      } : null
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total
    }
  }
})

