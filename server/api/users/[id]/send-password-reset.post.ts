/**
 * POST /api/users/:id/send-password-reset
 * Allows an admin to send a password reset email to a user.
 *
 * Requires: adminLevel >= 1
 */

import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../../db'
import { sendEmail, emailTemplates } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  // Require any admin level
  if (!user || (user.adminLevel ?? 0) < 1) {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  const db = useDrizzle()

  // Find target user
  const targetUser = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      status: schema.users.status
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get()

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  if (!targetUser.email) {
    throw createError({
      statusCode: 400,
      message: 'User does not have an email address'
    })
  }

  if (targetUser.status === 'INACTIVE') {
    throw createError({
      statusCode: 400,
      message: 'Cannot send password reset to inactive user'
    })
  }

  // Generate secure token (32 characters)
  const token = nanoid(32)
  const tokenId = nanoid()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

  // Store token in database
  await db.insert(schema.passwordResetTokens).values({
    id: tokenId,
    userId: targetUser.id,
    token,
    expiresAt,
    createdAt: now
  })

  // Build reset URL
  const config = useRuntimeConfig()
  const baseUrl = config.public?.appUrl || getRequestURL(event).origin
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Prepare email
  const recipientName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || 'there'
  const template = emailTemplates.passwordReset({
    recipientName,
    recipientEmail: targetUser.email,
    resetUrl,
    expiresAt
  })

  // Send email
  const emailResult = await sendEmail({
    to: targetUser.email,
    subject: 'Reset Your Password - Your Trusted Planner',
    html: template.html,
    text: template.text,
    event
  })

  if (!emailResult.success) {
    console.error('[AdminPasswordReset] Failed to send email:', emailResult.error)
    throw createError({
      statusCode: 500,
      message: 'Failed to send password reset email'
    })
  }

  const adminName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  console.log(`[AdminPasswordReset] ${adminName} sent password reset to ${targetUser.email}`)

  return {
    success: true,
    message: `Password reset email sent to ${targetUser.email}`
  }
})
