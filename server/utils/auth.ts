import type { H3Event } from 'h3'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

/**
 * Require authenticated user - returns user from session
 * For role-based access, use requireRole from rbac.ts instead
 */
export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return session.user
}

/**
 * SHA-256 hash using Web Crypto API (available in Cloudflare Workers)
 * Used for API token hashing — tokens are high-entropy so bcrypt slowness isn't needed
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Note: requireRole is in rbac.ts - use that instead

