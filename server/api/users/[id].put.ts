import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']).optional(),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  adminLevel: z.number().int().min(0).max(10).optional(),
})

// Staff roles that can have admin levels
const STAFF_ROLES = ['LAWYER', 'ADVISOR']

export default defineEventHandler(async (event) => {
  // Require admin level 2+ to update users (role-based ADMIN check kept for backwards compatibility)
  const currentUser = getAuthUser(event)
  if (currentUser.adminLevel < 2 && currentUser.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Admin level 2+ required to update users'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID required'
    })
  }

  const body = await readBody(event)
  const result = updateUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Fetch current user data to validate role/adminLevel combinations
  const targetUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get()

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  const { adminLevel, role, ...otherData } = result.data

  // Determine the effective role (new role if provided, otherwise current role)
  const effectiveRole = role ?? targetUser.role

  // If adminLevel is being set > 0, validate the role allows it
  if (adminLevel !== undefined && adminLevel > 0) {
    if (!STAFF_ROLES.includes(effectiveRole)) {
      throw createError({
        statusCode: 400,
        message: 'Admin levels can only be assigned to staff roles (Lawyer, Advisor)'
      })
    }

    // Require admin level 2+ to modify admin levels
    if (currentUser.adminLevel < 2) {
      throw createError({
        statusCode: 403,
        message: 'Admin level 2+ required to modify admin levels'
      })
    }

    // Prevent users from elevating their own admin level
    if (id === currentUser.id && adminLevel > currentUser.adminLevel) {
      throw createError({
        statusCode: 403,
        message: 'Cannot elevate your own admin level'
      })
    }

    // Prevent setting admin level higher than your own
    if (adminLevel > currentUser.adminLevel) {
      throw createError({
        statusCode: 403,
        message: 'Cannot set admin level higher than your own'
      })
    }
  }

  // Build update data
  const updateData: any = {
    ...otherData,
    updatedAt: new Date()
  }

  // Include role if provided
  if (role !== undefined) {
    updateData.role = role

    // Auto-reset adminLevel to 0 when changing to non-staff role
    if (!STAFF_ROLES.includes(role) && (targetUser.adminLevel ?? 0) > 0) {
      updateData.adminLevel = 0
    }
  }

  // Include adminLevel if provided (and valid per checks above)
  if (adminLevel !== undefined) {
    updateData.adminLevel = adminLevel
  }

  await db
    .update(schema.users)
    .set(updateData)
    .where(eq(schema.users.id, id))

  return { success: true }
})
