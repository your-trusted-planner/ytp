/**
 * Zoom OAuth Token Management
 *
 * Hybrid KV (fast cache) + DB (durable storage) pattern.
 * Access tokens cached in KV with TTL, refresh tokens stored in DB.
 * Follows the same pattern as google-calendar.ts getCachedAccessToken().
 *
 * Zoom app credentials (client ID, client secret, redirect URI) are stored
 * encrypted in KV via the integrations system — NOT in env vars.
 */

import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'

const ZOOM_TOKEN_URI = 'https://zoom.us/oauth/token'

export interface ZoomConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Get Zoom OAuth app credentials from the integrations system (encrypted in KV).
 * Falls back to a clear error if not configured.
 */
export async function getZoomConfig(event: H3Event): Promise<ZoomConfig> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const integration = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM'))
    .get()

  if (!integration?.credentialsKey) {
    throw createError({
      statusCode: 500,
      message: 'Zoom integration not configured. Go to Settings > Video Providers to set up Zoom credentials.'
    })
  }

  try {
    const { kv } = await import('@nuxthub/kv')
    const stored = await kv.get(integration.credentialsKey)
    if (!stored) {
      throw new Error('Zoom credentials not found in KV')
    }

    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored as Record<string, string>
    const { decrypt } = await import('./encryption')

    const clientId = parsed.clientId ? await decrypt(event, parsed.clientId) : ''
    const clientSecret = parsed.clientSecret ? await decrypt(event, parsed.clientSecret) : ''
    const redirectUri = parsed.redirectUri ? await decrypt(event, parsed.redirectUri) : ''

    if (!clientId || !clientSecret) {
      throw new Error('Zoom client ID or secret missing from stored credentials')
    }

    return { clientId, clientSecret, redirectUri }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: `Failed to retrieve Zoom credentials: ${err.message}`
    })
  }
}

/**
 * Get a valid Zoom access token for a user.
 * Checks KV cache first, refreshes from DB if expired.
 * @param userId - YTP user ID
 * @param event - H3 event (needed for decrypting Zoom app credentials on token refresh)
 */
export async function getZoomAccessToken(userId: string, event?: H3Event): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  // Get the user's active Zoom connection
  const connection = await db
    .select()
    .from(schema.videoMeetingConnections)
    .where(
      and(
        eq(schema.videoMeetingConnections.userId, userId),
        eq(schema.videoMeetingConnections.provider, 'zoom'),
        eq(schema.videoMeetingConnections.status, 'ACTIVE')
      )
    )
    .get()

  if (!connection) {
    throw new Error('No active Zoom connection found for this user')
  }

  // Try KV cache first
  if (connection.accessTokenKey) {
    try {
      const { kv } = await import('@nuxthub/kv')
      const cached = await kv.get(connection.accessTokenKey)
      if (cached && typeof cached === 'string') {
        return cached
      }
    } catch {
      // KV not available, fall through to refresh
    }
  }

  // Token expired or not cached — refresh
  return await refreshZoomToken(userId, connection, event)
}

/**
 * Refresh a Zoom access token using the refresh token stored in DB.
 * Updates both KV cache and DB with new tokens.
 */
async function refreshZoomToken(
  userId: string,
  connection: any,
  event?: H3Event
): Promise<string> {
  // Get Zoom app credentials from encrypted integrations store
  let zoomClientId: string
  let zoomClientSecret: string
  if (event) {
    const config = await getZoomConfig(event)
    zoomClientId = config.clientId
    zoomClientSecret = config.clientSecret
  } else {
    throw new Error('Zoom token refresh requires request context for credential decryption')
  }

  if (!connection.refreshToken) {
    // Mark connection as expired
    await updateConnectionStatus(connection.id, 'EXPIRED', 'No refresh token available')
    throw new Error('Zoom refresh token missing — user needs to reconnect')
  }

  const basicAuth = btoa(`${zoomClientId}:${zoomClientSecret}`)

  const response = await fetch(ZOOM_TOKEN_URI, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Zoom token refresh failed:', errorText)

    // Mark connection as errored
    await updateConnectionStatus(connection.id, 'ERROR', `Token refresh failed: ${response.status}`)
    throw new Error(`Failed to refresh Zoom token: ${errorText}`)
  }

  const data = await response.json()
  const { access_token, refresh_token, expires_in } = data

  // Cache access token in KV
  const kvKey = `zoom:token:${userId}`
  const ttl = Math.max((expires_in || 3600) - 300, 60) // 5 min before expiry, minimum 60s

  try {
    const { kv } = await import('@nuxthub/kv')
    await kv.set(kvKey, access_token, { ttl })
  } catch {
    // KV not available — token still works
  }

  // Update DB with new refresh token and expiry
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  await db
    .update(schema.videoMeetingConnections)
    .set({
      accessTokenKey: kvKey,
      refreshToken: refresh_token || connection.refreshToken, // Zoom may not always return a new one
      tokenExpiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
      status: 'ACTIVE',
      lastError: null,
      updatedAt: new Date()
    })
    .where(eq(schema.videoMeetingConnections.id, connection.id))

  return access_token
}

/**
 * Store initial Zoom tokens after OAuth callback.
 */
export async function storeZoomConnection(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  providerAccountId: string,
  providerEmail: string,
  scope: string
): Promise<string> {
  const { useDrizzle, schema } = await import('../db')
  const { generateId } = await import('./auth')
  const db = useDrizzle()

  const id = generateId()
  const kvKey = `zoom:token:${userId}`

  // Cache access token in KV
  try {
    const { kv } = await import('@nuxthub/kv')
    await kv.set(kvKey, accessToken, { ttl: Math.max(expiresIn - 300, 60) })
  } catch {
    // KV not available
  }

  // Check for existing connection and revoke it
  const existing = await db
    .select({ id: schema.videoMeetingConnections.id })
    .from(schema.videoMeetingConnections)
    .where(
      and(
        eq(schema.videoMeetingConnections.userId, userId),
        eq(schema.videoMeetingConnections.provider, 'zoom'),
        eq(schema.videoMeetingConnections.status, 'ACTIVE')
      )
    )
    .get()

  if (existing) {
    await db
      .update(schema.videoMeetingConnections)
      .set({ status: 'REVOKED', revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.videoMeetingConnections.id, existing.id))
  }

  // Insert new connection
  const now = new Date()
  await db.insert(schema.videoMeetingConnections).values({
    id,
    userId,
    provider: 'zoom',
    providerAccountId,
    providerEmail,
    accessTokenKey: kvKey,
    refreshToken,
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    scope,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  })

  return id
}

/**
 * Update a connection's status.
 */
async function updateConnectionStatus(
  connectionId: string,
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR',
  lastError?: string
): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const updates: Record<string, any> = {
    status,
    updatedAt: new Date()
  }
  if (lastError !== undefined) updates.lastError = lastError
  if (status === 'REVOKED') updates.revokedAt = new Date()

  await db
    .update(schema.videoMeetingConnections)
    .set(updates)
    .where(eq(schema.videoMeetingConnections.id, connectionId))
}

/**
 * Revoke a user's Zoom connection.
 */
export async function revokeZoomConnection(connectionId: string): Promise<void> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const connection = await db
    .select()
    .from(schema.videoMeetingConnections)
    .where(eq(schema.videoMeetingConnections.id, connectionId))
    .get()

  if (!connection) return

  // Clear KV cache
  if (connection.accessTokenKey) {
    try {
      const { kv } = await import('@nuxthub/kv')
      await kv.del(connection.accessTokenKey)
    } catch { /* KV not available */ }
  }

  await updateConnectionStatus(connectionId, 'REVOKED')
}
