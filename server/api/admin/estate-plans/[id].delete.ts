/**
 * DELETE /api/admin/estate-plans/:id
 *
 * Delete an estate plan and all related data.
 * Requires admin level 2.
 *
 * Query params:
 * - deletePeople: 'true' to also delete people associated with the plan (default: false)
 *
 * When deletePeople is false (default), people are unlinked but not deleted.
 * When deletePeople is true, all people who have roles in the plan are also deleted.
 *
 * Note: The primaryPersonId and secondaryPersonId on the plan are NOT deleted
 * unless they also appear in plan roles. This is intentional - the grantor may
 * exist in other contexts.
 */

import { eq, inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  // Admin level 2 is enforced by middleware for /api/admin/* paths
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }

  // Parse query params (use getQuery since readBody fails for DELETE in Workers)
  const query = getQuery(event)
  const deletePeople = query.deletePeople === 'true'

  const db = useDrizzle()

  // Get the plan first (for logging and validation)
  const [plan] = await db.select()
    .from(schema.estatePlans)
    .where(eq(schema.estatePlans.id, planId))

  if (!plan) {
    throw createError({ statusCode: 404, message: 'Estate plan not found' })
  }

  // Get plan name for logging
  let planName = plan.planName || 'Unnamed Plan'

  // If no plan name, try to get from trust
  if (!plan.planName) {
    const [trust] = await db.select()
      .from(schema.trusts)
      .where(eq(schema.trusts.planId, planId))
    if (trust?.trustName) {
      planName = trust.trustName
    }
  }

  // Get counts for logging
  const roles = await db.select({ id: schema.planRoles.id, personId: schema.planRoles.personId })
    .from(schema.planRoles)
    .where(eq(schema.planRoles.planId, planId))

  const versions = await db.select({ id: schema.planVersions.id })
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, planId))

  const events = await db.select({ id: schema.planEvents.id })
    .from(schema.planEvents)
    .where(eq(schema.planEvents.planId, planId))

  const [trust] = await db.select({ id: schema.trusts.id })
    .from(schema.trusts)
    .where(eq(schema.trusts.planId, planId))

  const wills = await db.select({ id: schema.wills.id })
    .from(schema.wills)
    .where(eq(schema.wills.planId, planId))

  const ancillaryDocs = await db.select({ id: schema.ancillaryDocuments.id })
    .from(schema.ancillaryDocuments)
    .where(eq(schema.ancillaryDocuments.planId, planId))

  const matterLinks = await db.select({ id: schema.planToMatters.id })
    .from(schema.planToMatters)
    .where(eq(schema.planToMatters.planId, planId))

  // Get unique person IDs from roles (for potential deletion)
  const personIdsInRoles = [...new Set(roles.map(r => r.personId).filter(Boolean))] as string[]

  // Track what will be deleted
  const deletionSummary = {
    planId,
    planName,
    rolesDeleted: roles.length,
    versionsDeleted: versions.length,
    eventsDeleted: events.length,
    trustDeleted: trust ? 1 : 0,
    willsDeleted: wills.length,
    ancillaryDocsDeleted: ancillaryDocs.length,
    matterLinksDeleted: matterLinks.length,
    peopleDeleted: 0,
    peopleUnlinked: personIdsInRoles.length
  }

  try {
    // Delete the plan (cascade will handle related tables)
    await db.delete(schema.estatePlans)
      .where(eq(schema.estatePlans.id, planId))

    // If deletePeople is true, delete the people who were in roles
    if (deletePeople && personIdsInRoles.length > 0) {
      // Delete people (this may fail if they have other relationships)
      // We'll delete one by one and track failures
      let deletedCount = 0
      const deleteErrors: string[] = []

      for (const personId of personIdsInRoles) {
        try {
          await db.delete(schema.people)
            .where(eq(schema.people.id, personId))
          deletedCount++
        } catch (error: any) {
          // Person may have other relationships (client record, other plans, etc.)
          deleteErrors.push(`Could not delete person ${personId}: ${error.message}`)
        }
      }

      deletionSummary.peopleDeleted = deletedCount
      deletionSummary.peopleUnlinked = personIdsInRoles.length - deletedCount

      if (deleteErrors.length > 0) {
        console.warn('Some people could not be deleted:', deleteErrors)
      }
    }

    // Log the deletion activity
    await logActivity({
      type: 'ADMIN_ACTION',
      userId: user.id,
      userRole: user.role,
      target: { type: 'estate_plan', id: planId, name: planName },
      event,
      details: {
        action: 'ESTATE_PLAN_DELETED',
        deletePeople,
        ...deletionSummary
      }
    })

    return {
      success: true,
      message: `Estate plan "${planName}" has been deleted`,
      summary: deletionSummary
    }

  } catch (error: any) {
    console.error('Error deleting estate plan:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to delete estate plan: ${error.message}`
    })
  }
})
