/**
 * DELETE /api/estate-plans/:id/roles/:roleId
 *
 * Remove a role from an estate plan.
 * Soft delete by default (status = 'REMOVED').
 * Hard delete available via query param ?hardDelete=true (requires admin level 2).
 *
 * IMPORTANT: Do NOT use readBody() - CF Workers DELETE body issue.
 * Use query params for options.
 */

import { useDrizzle, schema } from '../../../../db'
import { eq, and } from 'drizzle-orm'
import { logActivity } from '../../../../utils/activity-logger'
import { resolveEntityName } from '../../../../utils/entity-resolver'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const planId = getRouterParam(event, 'id')
  const roleId = getRouterParam(event, 'roleId')

  if (!planId) {
    throw createError({ statusCode: 400, message: 'Plan ID required' })
  }
  if (!roleId) {
    throw createError({ statusCode: 400, message: 'Role ID required' })
  }

  // Get options from query params (NOT body - CF Workers issue)
  const query = getQuery(event)
  const hardDelete = query.hardDelete === 'true'
  const reason = (query.reason as string) || 'User removed'

  // Hard delete requires admin level 2
  if (hardDelete && (user.adminLevel || 0) < 2) {
    throw createError({
      statusCode: 403,
      message: 'Hard delete requires admin level 2 or higher'
    })
  }

  const db = useDrizzle()

  // Verify role exists and belongs to this plan
  const [existingRole] = await db.select({
    role: schema.planRoles,
    person: schema.people
  })
    .from(schema.planRoles)
    .leftJoin(schema.people, eq(schema.planRoles.personId, schema.people.id))
    .where(and(
      eq(schema.planRoles.id, roleId),
      eq(schema.planRoles.planId, planId)
    ))

  if (!existingRole) {
    throw createError({ statusCode: 404, message: 'Role not found' })
  }

  const now = new Date()
  const personName = existingRole.person
    ? existingRole.person.fullName || [existingRole.person.firstName, existingRole.person.lastName].filter(Boolean).join(' ') || 'Unknown'
    : 'Unknown'

  if (hardDelete) {
    // Permanently delete the role
    await db.delete(schema.planRoles)
      .where(eq(schema.planRoles.id, roleId))
  } else {
    // Soft delete: set status to REMOVED
    await db.update(schema.planRoles)
      .set({
        status: 'REMOVED',
        terminationDate: now,
        terminationReason: reason,
        updatedAt: now
      })
      .where(eq(schema.planRoles.id, roleId))
  }

  // Log activity
  const planName = await resolveEntityName('estate_plan', planId)

  await logActivity({
    type: 'ESTATE_PLAN_UPDATED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'estate_plan', id: planId, name: planName || 'Estate Plan' },
    relatedEntities: existingRole.person
      ? [{ type: 'person', id: existingRole.role.personId, name: personName }]
      : undefined,
    event,
    details: {
      action: 'ROLE_REMOVED',
      roleId,
      roleType: existingRole.role.roleType,
      roleCategory: existingRole.role.roleCategory,
      personId: existingRole.role.personId,
      personName,
      deletionMethod: hardDelete ? 'hard_delete' : 'soft_delete',
      reason
    }
  })

  return {
    success: true,
    deleted: {
      roleId,
      roleType: existingRole.role.roleType,
      personName,
      method: hardDelete ? 'hard_delete' : 'soft_delete'
    }
  }
})
