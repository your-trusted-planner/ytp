import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../database'
import { verifyPassword } from '../../utils/auth'
import { mockDb, initMockDb } from '../../utils/mock-db'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Validate input
  const result = loginSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { email, password } = result.data
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    console.log('🔧 Using mock database for login')
    await initMockDb()
    const user = mockDb.users.findByEmail(email)
    console.log('🔍 Looking for user:', email, 'Found:', !!user)
    
    if (!user) {
      console.log('❌ User not found in mock database')
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }
    
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }
    
    // Create session
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      loggedInAt: new Date()
    })
    
    const { password: _, ...userWithoutPassword } = user
    return { user: userWithoutPassword }
  }
  
  // Real database code (when deployed to Cloudflare)
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .get()
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }
  
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials'
    })
  }
  
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    loggedInAt: new Date()
  })
  
  const { password: _, ...userWithoutPassword } = user
  return { user: userWithoutPassword }
})

