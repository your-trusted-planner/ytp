import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { verifyPassword, hashPassword } from '../../utils/auth'

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  const user = getAuthUser(event)

  const body = await readBody(event)
  
  const result = changePasswordSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { currentPassword, newPassword } = result.data
  const db = useDrizzle()
  
  // Get current user with password
  const currentUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .get()
  
  if (!currentUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }
  
  // Verify current password
  const isValid = await verifyPassword(currentPassword, currentUser.password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Current password is incorrect'
    })
  }
  
  // Hash and update new password
  const hashedPassword = await hashPassword(newPassword)
  await db
    .update(schema.users)
    .set({
      password: hashedPassword,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, user.id))
  
  return { success: true }
})

