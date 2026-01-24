/**
 * POST /api/auth/reset-password
 * Completes password reset by setting a new password using a valid token.
 *
 * Security considerations:
 * - Validates token exists, is not expired, and has not been used
 * - Marks token as used after successful reset
 * - Logs activity for audit trail
 */

import { z } from 'zod'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { hashPassword } from '../../utils/auth'
import { logActivity } from '../../utils/activity-logger'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = resetPasswordSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.errors[0]?.message || 'Invalid input'
    })
  }

  const { token, password } = result.data
  const db = useDrizzle()
  const now = new Date()

  // Find valid token
  const resetToken = await db
    .select({
      id: schema.passwordResetTokens.id,
      userId: schema.passwordResetTokens.userId,
      expiresAt: schema.passwordResetTokens.expiresAt,
      usedAt: schema.passwordResetTokens.usedAt
    })
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.token, token))
    .get()

  if (!resetToken) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired reset link. Please request a new password reset.'
    })
  }

  // Check if token is already used
  if (resetToken.usedAt) {
    throw createError({
      statusCode: 400,
      message: 'This reset link has already been used. Please request a new password reset.'
    })
  }

  // Check if token is expired
  if (resetToken.expiresAt < now) {
    throw createError({
      statusCode: 400,
      message: 'This reset link has expired. Please request a new password reset.'
    })
  }

  // Get user
  const user = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
      role: schema.users.role,
      status: schema.users.status
    })
    .from(schema.users)
    .where(eq(schema.users.id, resetToken.userId))
    .get()

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'User account not found. Please contact support.'
    })
  }

  if (user.status === 'INACTIVE') {
    throw createError({
      statusCode: 400,
      message: 'This account has been deactivated. Please contact support.'
    })
  }

  // Hash new password
  const hashedPassword = await hashPassword(password)

  // Update user password
  await db.update(schema.users)
    .set({
      password: hashedPassword,
      updatedAt: now
    })
    .where(eq(schema.users.id, user.id))

  // Mark token as used
  await db.update(schema.passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(schema.passwordResetTokens.id, resetToken.id))

  // Log activity
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Unknown'
  await logActivity({
    type: 'PASSWORD_RESET',
    userId: user.id,
    userRole: user.role,
    target: {
      type: 'user',
      id: user.id,
      name: userName
    },
    event,
    details: {
      method: 'email_token'
    }
  })

  console.log('[ResetPassword] Password reset successful for user:', user.email)

  return {
    success: true,
    message: 'Password reset successful. You can now log in with your new password.'
  }
})
