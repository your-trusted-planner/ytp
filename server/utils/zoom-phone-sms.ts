/**
 * Zoom Phone SMS Client
 *
 * Provides a typed client for sending SMS via the Zoom Phone API using
 * Server-to-Server OAuth (account_credentials grant). Credentials are
 * stored encrypted in KV via the `integrations` table (type: ZOOM_PHONE).
 *
 * Pure helper functions (error classification, request/response shaping)
 * are exported separately so they can be unit-tested without hitting
 * the DB, KV, or network.
 *
 * Dry-run mode: when the runtime config flag `zoomPhoneSmsDryRun` is true
 * (or env var `ZOOM_PHONE_SMS_DRY_RUN=true`), sendZoomPhoneSms() short-
 * circuits without calling Zoom. The caller gets a synthetic message ID
 * back so the calling flow still looks successful in logs/UI.
 */

import type { H3Event } from 'h3'

const ZOOM_OAUTH_URL = 'https://zoom.us/oauth/token'
const ZOOM_API_BASE = 'https://api.zoom.us/v2'
const KV_TOKEN_KEY = 'zoom-phone:access-token'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoomPhoneConfig {
  accountId: string
  clientId: string
  clientSecret: string
  fromPhoneNumber: string // E.164 — must be a number owned by the Zoom account
}

export interface SendSmsParams {
  to: string // E.164
  body: string
  event?: H3Event
  maxLength?: number // optional truncation (SMS ~1600 char ceiling)
}

export interface SendSmsResult {
  messageId: string
  dryRun: boolean
}

export interface BuildSendSmsBodyParams {
  fromPhoneNumber: string
  to: string
  content: string
  maxLength?: number
}

export type ZoomPhoneErrorClassification = 'transient' | 'permanent'

export class ZoomPhoneApiError extends Error {
  statusCode: number
  classification: ZoomPhoneErrorClassification

  constructor(message: string, statusCode: number, classification: ZoomPhoneErrorClassification) {
    super(message)
    this.name = 'ZoomPhoneApiError'
    this.statusCode = statusCode
    this.classification = classification
  }
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable)
// ---------------------------------------------------------------------------

/**
 * Classify an HTTP error response from Zoom as either transient (retry)
 * or permanent (don't retry, mark message FAILED).
 */
export function classifyZoomPhoneError(
  statusCode: number,
  bodyText: string
): ZoomPhoneErrorClassification {
  // Explicit transient signals: rate limiting, server errors, auth glitches
  if (statusCode === 429) return 'transient'
  if (statusCode >= 500 && statusCode < 600) return 'transient'
  if (statusCode === 401) return 'transient' // token may have expired mid-request

  // 10DLC / compliance rejections come back as 4xx with specific text.
  // These are permanent — retrying won't help.
  const lower = bodyText.toLowerCase()
  if (lower.includes('10dlc') || lower.includes('campaign not approved') || lower.includes('not registered')) {
    return 'permanent'
  }

  // Any other 4xx is permanent (invalid number, forbidden, not found, etc.)
  if (statusCode >= 400 && statusCode < 500) return 'permanent'

  // Default — treat as permanent so we don't spin in a retry loop on
  // unexpected responses.
  return 'permanent'
}

/**
 * Build the JSON request body for Zoom's send-SMS endpoint
 * (`POST /phone/sms/messages`).
 *
 * Shape: `{ to, from, content }` — flat, not the wrapped
 * `to_members`/`sender` shape used by the legacy `/phone/sms` endpoint.
 */
export function buildSendSmsBody(params: BuildSendSmsBodyParams): {
  to: string
  from: string
  content: string
} {
  let content = params.content
  if (params.maxLength && content.length > params.maxLength) {
    content = content.slice(0, params.maxLength)
  }

  return {
    to: params.to,
    from: params.fromPhoneNumber,
    content
  }
}

/**
 * Extract the message ID from Zoom's send-SMS response.
 */
export function parseSendSmsResponse(response: any): string {
  if (!response || typeof response !== 'object') {
    throw new ZoomPhoneApiError('Zoom Phone SMS response was empty or malformed', 0, 'permanent')
  }
  const id = response.id || response.message_id
  if (!id || typeof id !== 'string') {
    throw new ZoomPhoneApiError('Zoom Phone SMS response missing message ID', 0, 'permanent')
  }
  return id
}

/**
 * Check whether dry-run mode is enabled. Reads from runtime config first,
 * falls back to the `ZOOM_PHONE_SMS_DRY_RUN` env var, and defaults to
 * false.
 */
export function isZoomPhoneDryRun(): boolean {
  try {
    const config = useRuntimeConfig()
    if (config?.zoomPhoneSmsDryRun === true || config?.zoomPhoneSmsDryRun === 'true') return true
  }
  catch {
    // useRuntimeConfig may not be available outside of H3 context
  }
  const envVal = process.env.ZOOM_PHONE_SMS_DRY_RUN
  return envVal === 'true' || envVal === '1'
}

// ---------------------------------------------------------------------------
// Impure entry points (DB / KV / HTTP)
// ---------------------------------------------------------------------------

/**
 * Load the Zoom Phone S2S OAuth credentials from the integrations system.
 */
export async function getZoomPhoneConfig(event: H3Event): Promise<ZoomPhoneConfig> {
  const { useDrizzle, schema } = await import('../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  const integration = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.type, 'ZOOM_PHONE'))
    .get()

  if (!integration?.credentialsKey) {
    throw createError({
      statusCode: 500,
      message: 'Zoom Phone integration not configured. Go to Settings > Zoom Phone to set up credentials.'
    })
  }

  try {
    const { kv } = await import('@nuxthub/kv')
    const stored = await kv.get(integration.credentialsKey)
    if (!stored) {
      throw new Error('Zoom Phone credentials not found in KV')
    }

    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored as Record<string, string>
    const { decrypt } = await import('./encryption')

    const accountId = parsed.accountId ? await decrypt(event, parsed.accountId) : ''
    const clientId = parsed.clientId ? await decrypt(event, parsed.clientId) : ''
    const clientSecret = parsed.clientSecret ? await decrypt(event, parsed.clientSecret) : ''
    const fromPhoneNumber = parsed.fromPhoneNumber ? await decrypt(event, parsed.fromPhoneNumber) : ''

    if (!accountId || !clientId || !clientSecret || !fromPhoneNumber) {
      throw new Error('Zoom Phone credentials incomplete — re-save in Settings > Zoom Phone')
    }

    return { accountId, clientId, clientSecret, fromPhoneNumber }
  }
  catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: `Failed to retrieve Zoom Phone credentials: ${err.message}`
    })
  }
}

/**
 * Get a valid Zoom Phone access token using the S2S account_credentials grant.
 * Caches the token in KV with a TTL to avoid re-authenticating on every send.
 */
export async function getZoomPhoneAccessToken(event: H3Event): Promise<string> {
  // Try KV cache first
  try {
    const { kv } = await import('@nuxthub/kv')
    const cached = await kv.get(KV_TOKEN_KEY)
    if (cached && typeof cached === 'string') {
      return cached
    }
  }
  catch {
    // KV not available — fall through to refresh
  }

  const config = await getZoomPhoneConfig(event)
  const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`)

  const response = await fetch(ZOOM_OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: config.accountId
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    const classification = classifyZoomPhoneError(response.status, errorText)
    throw new ZoomPhoneApiError(
      `Zoom Phone token request failed (${response.status}): ${errorText}`,
      response.status,
      classification
    )
  }

  const data = await response.json() as { access_token: string, expires_in?: number }

  // Cache the token. Buffer 5 minutes before expiry.
  try {
    const { kv } = await import('@nuxthub/kv')
    const ttl = Math.max((data.expires_in || 3600) - 300, 60)
    await kv.set(KV_TOKEN_KEY, data.access_token, { ttl })
  }
  catch {
    // KV not available — token still works for this request
  }

  return data.access_token
}

/**
 * Send an SMS via the Zoom Phone API.
 *
 * Honors dry-run mode: when enabled, returns a synthetic message ID
 * without calling Zoom.
 */
export async function sendZoomPhoneSms(params: SendSmsParams): Promise<SendSmsResult> {
  if (isZoomPhoneDryRun()) {
    const syntheticId = `dryrun_${crypto.randomUUID()}`
    console.log(`[ZoomPhoneSms] DRY RUN — would send to ${params.to}: "${params.body.slice(0, 60)}${params.body.length > 60 ? '...' : ''}" (synthetic id: ${syntheticId})`)
    return { messageId: syntheticId, dryRun: true }
  }

  if (!params.event) {
    throw new ZoomPhoneApiError(
      'Zoom Phone SMS send requires an H3 event for credential decryption',
      0,
      'permanent'
    )
  }

  const config = await getZoomPhoneConfig(params.event)
  const accessToken = await getZoomPhoneAccessToken(params.event)

  const body = buildSendSmsBody({
    fromPhoneNumber: config.fromPhoneNumber,
    to: params.to,
    content: params.body,
    maxLength: params.maxLength
  })

  const response = await fetch(`${ZOOM_API_BASE}/phone/sms/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    const classification = classifyZoomPhoneError(response.status, errorText)
    throw new ZoomPhoneApiError(
      `Zoom Phone SMS send failed (${response.status}): ${errorText}`,
      response.status,
      classification
    )
  }

  const data = await response.json()
  const messageId = parseSendSmsResponse(data)

  return { messageId, dryRun: false }
}

/**
 * List phone numbers available in the Zoom account — used by the admin
 * "Test Connection" flow to verify the configured fromPhoneNumber.
 *
 * Tries the Zoom Phone API (`GET /phone/phone_numbers`) first, then
 * falls back to the Number Management API (`GET /number_management/numbers`).
 * Both may return slightly different response shapes so we normalize.
 */
export async function listZoomPhoneNumbers(event: H3Event): Promise<Array<{
  id: string
  number: string
  status: string
}>> {
  const accessToken = await getZoomPhoneAccessToken(event)
  const headers = { Authorization: `Bearer ${accessToken}` }

  // Try Zoom Phone endpoint first — lists numbers assigned to users/extensions
  const phoneResult = await tryListNumbers(
    `${ZOOM_API_BASE}/phone/phone_numbers?page_size=100`,
    headers
  )
  if (phoneResult.length > 0) return phoneResult

  // Fallback: Number Management API (replacement for deprecated /phone/numbers)
  const nmResult = await tryListNumbers(
    `${ZOOM_API_BASE}/number_management/numbers?page_size=100`,
    headers
  )
  if (nmResult.length > 0) return nmResult

  // Both returned empty — return empty (caller handles gracefully)
  console.warn('[ZoomPhoneSms] Both phone number listing endpoints returned empty results')
  return []
}

/**
 * Attempt to list phone numbers from a given endpoint. Returns empty
 * array on 4xx/5xx instead of throwing — lets the caller try fallbacks.
 */
async function tryListNumbers(
  url: string,
  headers: Record<string, string>
): Promise<Array<{ id: string, number: string, status: string }>> {
  try {
    const response = await fetch(url, { headers })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[ZoomPhoneSms] ${url} returned ${response.status}: ${errorText.slice(0, 200)}`)
      return []
    }

    const data = await response.json() as Record<string, any>

    // Zoom uses different keys across endpoints: phone_numbers, numbers, etc.
    const list: any[] = data.phone_numbers || data.numbers || []

    return list.map((n: any) => ({
      id: n.id || '',
      number: n.number || n.phone_number || '',
      status: n.status || 'unknown'
    }))
  }
  catch (err) {
    console.warn(`[ZoomPhoneSms] Failed to fetch ${url}:`, err)
    return []
  }
}
