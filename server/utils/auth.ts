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

// Note: requireRole is in rbac.ts - use that instead

