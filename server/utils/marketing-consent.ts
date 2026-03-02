/**
 * Marketing Consent Management
 *
 * Provides functions for managing per-channel marketing consent,
 * global unsubscribe, and self-service preference tokens.
 */

import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../db'
import { generateId } from './auth'

// ===================================
// TYPES
// ===================================

export interface ChannelConsent {
  channelId: string
  channelName: string
  channelType: string
  channelSlug: string
  channelDescription: string | null
  status: 'OPTED_IN' | 'OPTED_OUT'
  consentAt: Date | null
  consentSource: string | null
}

export interface PersonConsent {
  globalUnsubscribe: boolean
  globalUnsubscribeAt: Date | null
  globalUnsubscribeSource: string | null
  consents: ChannelConsent[]
}

export type ConsentSource = 'SELF_SERVICE' | 'STAFF' | 'IMPORT' | 'FORM'
export type GlobalUnsubscribeSource = 'LAWMATICS' | 'SELF_SERVICE' | 'STAFF'

interface SetConsentOptions {
  note?: string
  ip?: string
  userId?: string
}

// ===================================
// CONSENT QUERIES
// ===================================

/**
 * Get a person's full consent state: global unsubscribe + per-channel consents.
 * Returns consent status for all active channels, defaulting to OPTED_OUT
 * for channels without an explicit consent record.
 */
export async function getPersonConsent(personId: string): Promise<PersonConsent> {
  const db = useDrizzle()

  // Get person's global unsubscribe status
  const person = await db.select({
    globalUnsubscribe: schema.people.globalUnsubscribe,
    globalUnsubscribeAt: schema.people.globalUnsubscribeAt,
    globalUnsubscribeSource: schema.people.globalUnsubscribeSource
  })
    .from(schema.people)
    .where(eq(schema.people.id, personId))
    .get()

  if (!person) {
    throw createError({ statusCode: 404, message: 'Person not found' })
  }

  // Get all active channels
  const channels = await db.select()
    .from(schema.marketingChannels)
    .where(eq(schema.marketingChannels.isActive, 1))
    .orderBy(schema.marketingChannels.sortOrder)

  // Get person's existing consent records
  const consents = await db.select()
    .from(schema.marketingConsent)
    .where(eq(schema.marketingConsent.personId, personId))

  // Build a map of channelId -> consent record
  const consentMap = new Map(consents.map(c => [c.channelId, c]))

  // Merge channels with consent records
  const channelConsents: ChannelConsent[] = channels.map(ch => {
    const consent = consentMap.get(ch.id)
    return {
      channelId: ch.id,
      channelName: ch.name,
      channelType: ch.channelType,
      channelSlug: ch.slug,
      channelDescription: ch.description,
      status: consent?.status as 'OPTED_IN' | 'OPTED_OUT' ?? 'OPTED_OUT',
      consentAt: consent?.consentAt ?? null,
      consentSource: consent?.consentSource ?? null
    }
  })

  return {
    globalUnsubscribe: person.globalUnsubscribe === 1,
    globalUnsubscribeAt: person.globalUnsubscribeAt,
    globalUnsubscribeSource: person.globalUnsubscribeSource,
    consents: channelConsents
  }
}

// ===================================
// CONSENT MUTATIONS
// ===================================

/**
 * Set consent for a specific person+channel. Upserts the marketingConsent
 * record and inserts a history row for audit.
 */
export async function setConsent(
  personId: string,
  channelId: string,
  status: 'OPTED_IN' | 'OPTED_OUT',
  source: ConsentSource,
  options: SetConsentOptions = {}
): Promise<void> {
  const db = useDrizzle()
  const now = new Date()

  // Look up existing consent
  const existing = await db.select()
    .from(schema.marketingConsent)
    .where(and(
      eq(schema.marketingConsent.personId, personId),
      eq(schema.marketingConsent.channelId, channelId)
    ))
    .get()

  const previousStatus = existing?.status ?? null

  if (existing) {
    // Update existing record
    await db.update(schema.marketingConsent)
      .set({
        status,
        consentSource: source,
        consentNote: options.note ?? null,
        consentIp: options.ip ?? null,
        consentAt: now,
        updatedAt: now
      })
      .where(eq(schema.marketingConsent.id, existing.id))
  } else {
    // Insert new record
    await db.insert(schema.marketingConsent).values({
      id: generateId(),
      personId,
      channelId,
      status,
      consentSource: source,
      consentNote: options.note ?? null,
      consentIp: options.ip ?? null,
      consentAt: now,
      updatedAt: now
    })
  }

  // Insert history row
  await db.insert(schema.marketingConsentHistory).values({
    id: generateId(),
    personId,
    channelId,
    previousStatus,
    newStatus: status,
    changedByUserId: options.userId ?? null,
    changedAt: now,
    consentSource: source,
    consentIp: options.ip ?? null,
    note: options.note ?? null
  })
}

/**
 * Set global unsubscribe for a person. Updates the people record and
 * inserts history rows for all active channels (opted out).
 */
export async function setGlobalUnsubscribe(
  personId: string,
  source: GlobalUnsubscribeSource,
  userId?: string
): Promise<void> {
  const db = useDrizzle()
  const now = new Date()

  // Update global unsubscribe on people record
  await db.update(schema.people)
    .set({
      globalUnsubscribe: 1,
      globalUnsubscribeAt: now,
      globalUnsubscribeSource: source,
      updatedAt: now
    })
    .where(eq(schema.people.id, personId))

  // Get all active channels
  const channels = await db.select({ id: schema.marketingChannels.id })
    .from(schema.marketingChannels)
    .where(eq(schema.marketingChannels.isActive, 1))

  // Get existing consent records for this person
  const existingConsents = await db.select()
    .from(schema.marketingConsent)
    .where(eq(schema.marketingConsent.personId, personId))

  const consentMap = new Map(existingConsents.map(c => [c.channelId, c]))

  // Opt out of every active channel and record history
  for (const channel of channels) {
    const existing = consentMap.get(channel.id)
    const previousStatus = existing?.status ?? null

    if (existing) {
      await db.update(schema.marketingConsent)
        .set({
          status: 'OPTED_OUT',
          consentSource: source === 'LAWMATICS' ? 'IMPORT' : source as ConsentSource,
          consentAt: now,
          updatedAt: now
        })
        .where(eq(schema.marketingConsent.id, existing.id))
    } else {
      await db.insert(schema.marketingConsent).values({
        id: generateId(),
        personId,
        channelId: channel.id,
        status: 'OPTED_OUT',
        consentSource: source === 'LAWMATICS' ? 'IMPORT' : source as ConsentSource,
        consentAt: now,
        updatedAt: now
      })
    }

    await db.insert(schema.marketingConsentHistory).values({
      id: generateId(),
      personId,
      channelId: channel.id,
      previousStatus,
      newStatus: 'OPTED_OUT',
      changedByUserId: userId ?? null,
      changedAt: now,
      consentSource: source === 'LAWMATICS' ? 'IMPORT' : source,
      note: `Global unsubscribe via ${source}`
    })
  }
}

// ===================================
// PREFERENCE TOKENS
// ===================================

/**
 * Generate an HMAC-SHA256 signed preference token for self-service consent management.
 * Token contains personId and 30-day expiry, encoded as base64url JSON.
 */
export async function generatePreferenceToken(personId: string): Promise<string> {
  const config = useRuntimeConfig()
  const secret = config.session?.password || config.nuxtAuthPassword
  if (!secret) {
    throw new Error('NUXT_SESSION_PASSWORD not configured')
  }

  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  const payload = JSON.stringify({ personId, exp })
  const payloadB64 = base64urlEncode(payload)

  const signature = await hmacSign(payloadB64, secret as string)

  return `${payloadB64}.${signature}`
}

/**
 * Verify a preference token. Returns the personId if valid and not expired,
 * or null if invalid/expired.
 */
export async function verifyPreferenceToken(token: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const secret = config.session?.password || config.nuxtAuthPassword
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, signature] = parts

  // Verify signature
  const expectedSignature = await hmacSign(payloadB64, secret as string)
  if (signature !== expectedSignature) return null

  // Decode and check expiry
  try {
    const payload = JSON.parse(base64urlDecode(payloadB64))
    if (!payload.personId || !payload.exp) return null
    if (Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload.personId
  } catch {
    return null
  }
}

// ===================================
// HELPERS
// ===================================

function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const bytes = new Uint8Array(signature)
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
