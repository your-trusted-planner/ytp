/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow by sending a reset link via email.
 *
 * Security considerations:
 * - Always returns success to prevent email enumeration attacks
 * - Uses cryptographically secure random tokens
 * - Tokens expire after 1 hour
 */

import { z } from 'zod'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../db'
import { sendEmail, emailTemplates } from '../../utils/email'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = forgotPasswordSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email address'
    })
  }

  const { email } = result.data
  const db = useDrizzle()

  // Find user by email
  const user = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
      status: schema.users.status
    })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .get()

  // Always return success to prevent email enumeration
  // But only send email if user exists and is not inactive
  if (user && user.status !== 'INACTIVE') {
    try {
      // Generate secure token (32 characters)
      const token = nanoid(32)
      const tokenId = nanoid()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

      // Store token in database
      await db.insert(schema.passwordResetTokens).values({
        id: tokenId,
        userId: user.id,
        token,
        expiresAt,
        createdAt: now
      })

      // Build reset URL
      const config = useRuntimeConfig()
      const baseUrl = config.public?.appUrl || getRequestURL(event).origin
      const resetUrl = `${baseUrl}/reset-password?token=${token}`

      // Prepare email
      const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there'
      const template = emailTemplates.passwordReset({
        recipientName,
        recipientEmail: user.email!,
        resetUrl,
        expiresAt
      })

      // Send email
      const emailResult = await sendEmail({
        to: user.email!,
        subject: 'Reset Your Password - Your Trusted Planner',
        html: template.html,
        text: template.text,
        event
      })

      if (!emailResult.success) {
        console.error('[ForgotPassword] Failed to send email:', emailResult.error)
      } else {
        console.log('[ForgotPassword] Reset email sent to:', user.email)
      }
    } catch (error) {
      console.error('[ForgotPassword] Error processing request:', error)
      // Don't expose error to client
    }
  } else if (user?.status === 'INACTIVE') {
    console.log('[ForgotPassword] Ignored reset request for inactive user:', email)
  } else {
    console.log('[ForgotPassword] No user found with email:', email)
  }

  // Always return success
  return {
    success: true,
    message: 'If an account exists with that email, you will receive a password reset link shortly.'
  }
})
