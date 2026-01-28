/**
 * GET /api/auth/verify-reset-token
 * Validates a password reset token before showing the reset form.
 *
 * Returns the validity status and a masked email for display purposes.
 */

import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token) {
    return {
      valid: false,
      error: 'No token provided'
    }
  }

  const db = useDrizzle()
  const now = new Date()

  // Find token
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
    return {
      valid: false,
      error: 'Invalid reset link'
    }
  }

  // Check if already used
  if (resetToken.usedAt) {
    return {
      valid: false,
      error: 'This reset link has already been used'
    }
  }

  // Check if expired
  if (resetToken.expiresAt < now) {
    return {
      valid: false,
      error: 'This reset link has expired'
    }
  }

  // Get user email for display
  const user = await db
    .select({
      email: schema.users.email,
      status: schema.users.status
    })
    .from(schema.users)
    .where(eq(schema.users.id, resetToken.userId))
    .get()

  if (!user || user.status === 'INACTIVE') {
    return {
      valid: false,
      error: 'User account not found or has been deactivated'
    }
  }

  // Mask email for display (e.g., j***@example.com)
  let maskedEmail: string | undefined
  if (user.email) {
    const [local, domain] = user.email.split('@')
    if (local && domain) {
      const maskedLocal = local.charAt(0) + '***'
      maskedEmail = `${maskedLocal}@${domain}`
    }
  }

  return {
    valid: true,
    email: maskedEmail
  }
})
