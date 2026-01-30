import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { hashPassword, generateId } from '../../utils/auth'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'LAWYER', 'STAFF', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']).default('CLIENT'),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
  adminLevel: z.number().int().min(0).max(10).optional(),
  defaultHourlyRate: z.number().int().min(0).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  // Require admin level 2+ to create users (role-based ADMIN check kept for backwards compatibility)
  const currentUser = getAuthUser(event)
  if (currentUser.adminLevel < 2 && currentUser.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Admin level 2+ required to create users'
    })
  }

  const body = await readBody(event)
  const result = createUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, result.data.email))
    .get()

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: 'Email already exists'
    })
  }

  // Hash password
  const passwordHash = await hashPassword(result.data.password)

  // Generate user ID
  const userId = generateId()

  // Firm roles that can have admin levels (internal employees only, not external advisors)
  const FIRM_ROLES = ['LAWYER', 'STAFF']

  // Handle adminLevel with authorization checks
  let adminLevel = 0
  if (result.data.adminLevel !== undefined && result.data.adminLevel > 0) {
    // Only firm roles can have admin levels
    if (!FIRM_ROLES.includes(result.data.role)) {
      throw createError({
        statusCode: 400,
        message: 'Admin levels can only be assigned to firm roles (Lawyer, Staff)'
      })
    }

    // Require admin level 2+ to set admin levels
    if (currentUser.adminLevel < 2) {
      throw createError({
        statusCode: 403,
        message: 'Admin level 2+ required to set admin levels'
      })
    }

    // Cannot set admin level higher than your own
    if (result.data.adminLevel > currentUser.adminLevel) {
      throw createError({
        statusCode: 403,
        message: 'Cannot set admin level higher than your own'
      })
    }

    adminLevel = result.data.adminLevel
  }

  // Handle defaultHourlyRate (only for LAWYER/STAFF roles)
  let defaultHourlyRate = null
  if (result.data.defaultHourlyRate !== undefined && result.data.defaultHourlyRate !== null) {
    if (FIRM_ROLES.includes(result.data.role)) {
      defaultHourlyRate = result.data.defaultHourlyRate
    } else if (result.data.defaultHourlyRate > 0) {
      throw createError({
        statusCode: 400,
        message: 'Default hourly rate can only be set for Lawyer and Staff roles'
      })
    }
  }

  // Insert user
  await db.insert(schema.users).values({
    id: userId,
    email: result.data.email,
    password: passwordHash,
    firstName: result.data.firstName || null,
    lastName: result.data.lastName || null,
    phone: result.data.phone || null,
    role: result.data.role,
    status: result.data.status,
    adminLevel,
    defaultHourlyRate,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return {
    success: true,
    userId
  }
})
