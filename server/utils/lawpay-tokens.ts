/**
 * LawPay Token Management - Hybrid DB + KV approach
 *
 * Strategy:
 * - Database: Source of truth for token metadata and relationships
 * - KV: Fast cache for active tokens with automatic TTL
 */

import { nanoid } from 'nanoid'

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
  const db = hubDatabase()
  const kv = hubKV()
  const connectionId = nanoid()
  const expiresAt = Date.now() + (expiresIn * 1000)

  // 1. Store metadata in Database (source of truth)
  await db.prepare(`
    INSERT INTO lawpay_connections (
      id, user_id, merchant_public_key, scope, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    connectionId,
    userId,
    merchantPublicKey,
    scope,
    expiresAt,
    Date.now(),
    Date.now()
  ).run()

  // 2. Store tokens in KV with TTL (fast access cache)
  const ttlSeconds = Math.floor(expiresIn)

  await kv.put(
    `lawpay:access:${userId}`,
    accessToken,
    { expirationTtl: ttlSeconds }
  )

  if (refreshToken) {
    // Refresh tokens typically last longer, but set a reasonable TTL
    await kv.put(
      `lawpay:refresh:${userId}`,
      refreshToken,
      { expirationTtl: ttlSeconds * 2 } // 2x access token lifetime
    )
  }

  return connectionId
}

/**
 * Get LawPay access token for a user
 * Tries KV cache first, falls back to DB if needed
 */
export async function getLawPayAccessToken(userId: string): Promise<string | null> {
  const kv = hubKV()

  // Try KV cache first (fast path)
  const cachedToken = await kv.get(`lawpay:access:${userId}`)
  if (cachedToken) {
    return cachedToken
  }

  // KV miss - check if connection exists in DB
  const db = hubDatabase()
  const connection = await db.prepare(`
    SELECT * FROM lawpay_connections
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).bind(userId, Date.now()).first() as LawPayConnection | null

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
  const db = hubDatabase()

  const connection = await db.prepare(`
    SELECT * FROM lawpay_connections
    WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).bind(userId, Date.now()).first()

  return connection as LawPayConnection | null
}

/**
 * Revoke LawPay connection (mark as revoked, clear KV cache)
 */
export async function revokeLawPayConnection(userId: string): Promise<void> {
  const db = hubDatabase()
  const kv = hubKV()

  // Mark as revoked in DB
  await db.prepare(`
    UPDATE lawpay_connections
    SET revoked_at = ?, updated_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).bind(Date.now(), Date.now(), userId).run()

  // Clear from KV cache
  await kv.delete(`lawpay:access:${userId}`)
  await kv.delete(`lawpay:refresh:${userId}`)
}

/**
 * Refresh LawPay access token
 * Updates both DB and KV
 */
export async function refreshLawPayToken(userId: string): Promise<string | null> {
  const kv = hubKV()

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
