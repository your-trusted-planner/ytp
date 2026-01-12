// Create a new API token for programmatic access
import { generateId, hashPassword } from '../../utils/auth'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const body = await readBody(event)
  const { name, expiresAt } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Token name is required'
    })
  }

  // Generate a secure random token (32 bytes = 64 hex characters)
  const token = crypto.randomBytes(32).toString('hex')

  // Hash the token for storage (never store plaintext)
  const tokenHash = await hashPassword(token)

  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const id = generateId()
  const now = new Date()

  // Parse expiration date if provided
  let expirationDate: Date | null = null
  if (expiresAt) {
    expirationDate = new Date(expiresAt)
    if (isNaN(expirationDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: 'Invalid expiration date'
      })
    }
  }

  // Store the token hash in the database
  await db.insert(schema.apiTokens).values({
    id,
    userId: user.id,
    tokenHash,
    name: name.trim(),
    scopes: null, // For future use
    expiresAt: expirationDate,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now
  })

  // Return the plaintext token (this is the only time it's visible)
  return {
    success: true,
    message: 'API token created successfully. Save this token - you won\'t be able to see it again!',
    token: {
      id,
      name: name.trim(),
      token: token, // Plaintext token - only shown once
      expiresAt: expirationDate?.toISOString() || null,
      createdAt: now.toISOString()
    }
  }
})
