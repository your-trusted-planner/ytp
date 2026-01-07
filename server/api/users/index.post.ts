import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { hashPassword, generateId } from '../../utils/auth'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT', 'ADVISOR', 'LEAD', 'PROSPECT']).default('CLIENT'),
  status: z.enum(['PROSPECT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['ADMIN'])

  const body = await readBody(event)
  const result = createUserSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }

  const { useDrizzle, schema } = await import('../../database')
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
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return {
    success: true,
    userId
  }
})
