import { desc, eq, and, gte, lte, sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { resolveEntityNames, getEntityLink } from '../../utils/entity-resolver'
import type { EntityType, EntityRef } from '../../utils/activity-logger'

interface ResolvedEntityRef {
  type: EntityType
  id: string
  snapshotName: string    // Name at log time
  currentName: string     // Current name (may differ)
  link: string | null     // URL path to entity
}

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
  const resolveNames = query.resolveNames === 'true'

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

  // If resolveNames is requested, batch resolve all entity references
  let currentNames: Map<string, string> | undefined
  if (resolveNames) {
    // Collect all entity refs that need resolution
    const entityRefs: Array<{ type: EntityType; id: string }> = []

    for (const activity of activities) {
      const metadata = activity.metadata ? JSON.parse(activity.metadata) : null

      // Add target entity ref
      if (metadata?.target?.type && metadata?.target?.id) {
        entityRefs.push({
          type: metadata.target.type as EntityType,
          id: metadata.target.id
        })
      }

      // Add related entity refs
      if (metadata?.relatedEntities && Array.isArray(metadata.relatedEntities)) {
        for (const ref of metadata.relatedEntities) {
          if (ref?.type && ref?.id) {
            entityRefs.push({
              type: ref.type as EntityType,
              id: ref.id
            })
          }
        }
      }

      // Also resolve legacy targetType/targetId if present and no structured target
      if (!metadata?.target && activity.targetType && activity.targetId) {
        entityRefs.push({
          type: activity.targetType as EntityType,
          id: activity.targetId
        })
      }
    }

    // Batch resolve all names
    if (entityRefs.length > 0) {
      currentNames = await resolveEntityNames(entityRefs)
    }
  }

  // Transform activities for response
  const transformedActivities = activities.map(activity => {
    const metadata = activity.metadata ? JSON.parse(activity.metadata) : null

    // Build resolved entity references if resolveNames is true
    let resolvedTarget: ResolvedEntityRef | undefined
    let resolvedRelatedEntities: ResolvedEntityRef[] | undefined

    if (resolveNames && currentNames) {
      // Resolve target
      if (metadata?.target) {
        const target = metadata.target as EntityRef
        const currentName = currentNames.get(`${target.type}:${target.id}`) || target.name
        resolvedTarget = {
          type: target.type,
          id: target.id,
          snapshotName: target.name,
          currentName,
          link: getEntityLink(target.type, target.id)
        }
      } else if (activity.targetType && activity.targetId) {
        // Handle legacy targetType/targetId
        const type = activity.targetType as EntityType
        const id = activity.targetId
        const currentName = currentNames.get(`${type}:${id}`) || 'Unknown'
        resolvedTarget = {
          type,
          id,
          snapshotName: currentName, // Legacy activities don't have snapshot name
          currentName,
          link: getEntityLink(type, id)
        }
      }

      // Resolve related entities
      if (metadata?.relatedEntities && Array.isArray(metadata.relatedEntities)) {
        resolvedRelatedEntities = metadata.relatedEntities.map((ref: EntityRef) => {
          const currentName = currentNames!.get(`${ref.type}:${ref.id}`) || ref.name
          return {
            type: ref.type,
            id: ref.id,
            snapshotName: ref.name,
            currentName,
            link: getEntityLink(ref.type, ref.id)
          }
        })
      }
    }

    return {
      id: activity.id,
      type: activity.type,
      description: activity.description,
      metadata,
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
      } : null,
      // New structured entity references (only included when resolveNames=true)
      ...(resolveNames && resolvedTarget ? { target: resolvedTarget } : {}),
      ...(resolveNames && resolvedRelatedEntities && resolvedRelatedEntities.length > 0 ? { relatedEntities: resolvedRelatedEntities } : {})
    }
  })

  return {
    activities: transformedActivities,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total
    }
  }
})
