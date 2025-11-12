import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../database'
import { hashPassword, generateId } from '../../utils/auth'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Validate input
  const result = registerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { email, password, firstName, lastName, phone } = result.data
  const db = useDrizzle()
  
  // Check if user already exists
  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get()
  
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'User already exists'
    })
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password)
  
  // Create user
  const newUser = {
    id: generateId(),
    email,
    password: hashedPassword,
    role: 'PROSPECT' as const,
    firstName,
    lastName,
    phone,
    status: 'PROSPECT' as const
  }
  
  await db.insert(schema.users).values(newUser)
  
  // Create session
  await setUserSession(event, {
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    },
    loggedInAt: new Date()
  })
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser
  
  return {
    user: userWithoutPassword
  }
})

