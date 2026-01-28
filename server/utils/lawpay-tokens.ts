/**
 * LawPay Token Management - Hybrid DB + KV approach
 *
 * Strategy:
 * - Database: Source of truth for token metadata and relationships
 * - KV: Fast cache for active tokens with automatic TTL
 */

import { nanoid } from 'nanoid'
import { kv } from '@nuxthub/kv'

export interface LawPayConnection {
  id: string
  userId: string
  merchantPublicKey: string
  merchantName?: string
  scope: string
  expiresAt: number
  createdAt: number
  updatedAt: number
  revokedAt?: number
}

/**
 * Store a new LawPay connection (tokens in both DB and KV)
 */
export async function storeLawPayConnection(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  merchantPublicKey: string,
  scope: string
): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()
  const connectionId = nanoid()
  const expiresAtTimestamp = Date.now() + (expiresIn * 1000)
  const now = new Date()
  const expiresAt = new Date(expiresAtTimestamp)

  // 1. Store metadata in Database (source of truth)
  await db.insert(schema.lawpayConnections).values({
    id: connectionId,
    userId,
    merchantPublicKey,
    scope,
    expiresAt,
    createdAt: now,
    updatedAt: now
  })

  // 2. Store tokens in KV with TTL (fast access cache)
  const ttlSeconds = Math.floor(expiresIn)

  await kv.set(
    `lawpay:access:${userId}`,
    accessToken,
    { ttl: ttlSeconds }
  )

  if (refreshToken) {
    // Refresh tokens typically last longer, but set a reasonable TTL
    await kv.set(
      `lawpay:refresh:${userId}`,
      refreshToken,
      { ttl: ttlSeconds * 2 } // 2x access token lifetime
    )
  }

  return connectionId
}

/**
 * Get LawPay access token for a user
 * Tries KV cache first, falls back to DB if needed
 */
export async function getLawPayAccessToken(userId: string): Promise<string | null> {
  // Try KV cache first (fast path)
  const cachedToken = await kv.get(`lawpay:access:${userId}`)
  if (cachedToken) {
    return cachedToken
  }

  // KV miss - check if connection exists in DB
  const { useDrizzle, schema } = await import('../db')
  const { eq, and, isNull, gt, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const connection = await db.select()
    .from(schema.lawpayConnections)
    .where(and(
      eq(schema.lawpayConnections.userId, userId),
      isNull(schema.lawpayConnections.revokedAt),
      gt(schema.lawpayConnections.expiresAt, new Date())
    ))
    .orderBy(desc(schema.lawpayConnections.createdAt))
    .limit(1)
    .get() as LawPayConnection | null

  if (!connection) {
    return null // No valid connection
  }

  // Connection exists but token not in KV - needs refresh
  // You would implement token refresh here
  console.warn(`LawPay token for user ${userId} not in cache - needs refresh`)
  return null
}

/**
 * Get LawPay connection info from database
 */
export async function getLawPayConnection(userId: string): Promise<LawPayConnection | null> {
  const { useDrizzle, schema } = await import('../db')
  const { eq, and, isNull, gt, desc } = await import('drizzle-orm')
  const db = useDrizzle()

  const connection = await db.select()
    .from(schema.lawpayConnections)
    .where(and(
      eq(schema.lawpayConnections.userId, userId),
      isNull(schema.lawpayConnections.revokedAt),
      gt(schema.lawpayConnections.expiresAt, new Date())
    ))
    .orderBy(desc(schema.lawpayConnections.createdAt))
    .limit(1)
    .get()

  return connection as LawPayConnection | null
}

/**
 * Revoke LawPay connection (mark as revoked, clear KV cache)
 */
export async function revokeLawPayConnection(userId: string): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const { eq, and, isNull } = await import('drizzle-orm')
  const db = useDrizzle()

  const now = new Date()

  // Mark as revoked in DB
  await db.update(schema.lawpayConnections)
    .set({
      revokedAt: now,
      updatedAt: now
    })
    .where(and(
      eq(schema.lawpayConnections.userId, userId),
      isNull(schema.lawpayConnections.revokedAt)
    ))

  // Clear from KV cache
  await kv.del(`lawpay:access:${userId}`)
  await kv.del(`lawpay:refresh:${userId}`)
}

/**
 * Refresh LawPay access token
 * Updates both DB and KV
 */
export async function refreshLawPayToken(userId: string): Promise<string | null> {
  // Get refresh token from KV
  const refreshToken = await kv.get(`lawpay:refresh:${userId}`)
  if (!refreshToken) {
    return null // No refresh token available
  }

  // TODO: Call LawPay token refresh endpoint
  // const newTokens = await refreshLawPayAccessToken(refreshToken)

  // Update DB and KV with new tokens
  // ...

  return null // Placeholder
}

/**
 * Check if user has an active LawPay connection
 */
export async function hasActiveLawPayConnection(userId: string): Promise<boolean> {
  const connection = await getLawPayConnection(userId)
  return connection !== null
}
