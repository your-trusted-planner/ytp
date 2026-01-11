/**
 * API endpoints for managing user's stored signature image
 *
 * GET  - Retrieve current signature image
 * POST - Save/update signature image
 * DELETE - Remove signature image
 *
 * The signature image is stored as base64 data URL (PNG, JPG, or SVG).
 * Users must affirmatively adopt their stored signature each time they use it.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../db'

// Supported image formats
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_IMAGE_SIZE = 500 * 1024 // 500KB

// Validation schema for saving signature
const saveSignatureSchema = z.object({
  signatureImage: z.string().min(100).refine(
    (data) => {
      // Must be a data URL
      if (!data.startsWith('data:')) return false
      // Extract mime type
      const match = data.match(/^data:([^;,]+)/)
      if (!match) return false
      return ALLOWED_MIME_TYPES.includes(match[1])
    },
    { message: 'Invalid image format. Must be PNG, JPG, or SVG.' }
  ).refine(
    (data) => {
      // Check approximate size (base64 is ~33% larger than binary)
      const base64Data = data.split(',')[1]
      if (!base64Data) return false
      const approximateSize = (base64Data.length * 3) / 4
      return approximateSize <= MAX_IMAGE_SIZE
    },
    { message: 'Image too large. Maximum size is 500KB.' }
  )
})

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // Require authentication
  const session = await requireUserSession(event)
  const userId = session.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  if (!isDatabaseAvailable()) {
    throw createError({
      statusCode: 503,
      message: 'Database connection required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // GET - Retrieve signature image
  if (method === 'GET') {
    const user = await db
      .select({
        signatureImage: schema.users.signatureImage,
        signatureImageUpdatedAt: schema.users.signatureImageUpdatedAt
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get()

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    return {
      success: true,
      data: {
        hasSignatureImage: !!user.signatureImage,
        signatureImage: user.signatureImage || null,
        updatedAt: user.signatureImageUpdatedAt?.toISOString() || null
      }
    }
  }

  // POST - Save signature image
  if (method === 'POST') {
    const body = await readBody(event)
    const parseResult = saveSignatureSchema.safeParse(body)

    if (!parseResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request',
        data: parseResult.error.flatten()
      })
    }

    const { signatureImage } = parseResult.data
    const now = new Date()

    await db
      .update(schema.users)
      .set({
        signatureImage,
        signatureImageUpdatedAt: now,
        updatedAt: now
      })
      .where(eq(schema.users.id, userId))

    return {
      success: true,
      data: {
        message: 'Signature image saved successfully',
        updatedAt: now.toISOString()
      }
    }
  }

  // DELETE - Remove signature image
  if (method === 'DELETE') {
    const now = new Date()

    await db
      .update(schema.users)
      .set({
        signatureImage: null,
        signatureImageUpdatedAt: null,
        updatedAt: now
      })
      .where(eq(schema.users.id, userId))

    return {
      success: true,
      data: {
        message: 'Signature image removed successfully'
      }
    }
  }

  throw createError({
    statusCode: 405,
    message: 'Method not allowed'
  })
})
