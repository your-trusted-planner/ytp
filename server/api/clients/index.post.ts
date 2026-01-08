import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { hashPassword, generateId, requireRole } from '../../utils/auth'

const createClientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const body = await readBody(event)
  const result = createClientSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { email, firstName, lastName, phone, password } = result.data
  const db = useDrizzle()
  
  // Check if user already exists
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get()
  
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'User already exists'
    })
  }
  
  const hashedPassword = await hashPassword(password)
  const userId = generateId()
  
  // Create user
  await db.insert(schema.users).values({
    id: userId,
    email,
    firstName,
    lastName,
    phone,
    password: hashedPassword,
    role: 'CLIENT',
    status: 'ACTIVE'
  })
  
  // Create client profile
  await db.insert(schema.clientProfiles).values({
    id: generateId(),
    userId
  })
  
  return { success: true, userId }
})

