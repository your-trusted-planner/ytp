/**
 * Tests for Marketing Consent Logic
 *
 * Tests the core consent management functions. Since the actual utility
 * imports @nuxthub/db (virtual module unavailable in Vitest), we simulate
 * the pure logic (token generation/verification, consent state) inline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===================================
// Simulate token helpers from marketing-consent.ts
// (cannot import directly — module imports @nuxthub/db)
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

async function generatePreferenceToken(personId: string, secret: string, ttlSeconds: number = 30 * 24 * 60 * 60): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = JSON.stringify({ personId, exp })
  const payloadB64 = base64urlEncode(payload)
  const signature = await hmacSign(payloadB64, secret)
  return `${payloadB64}.${signature}`
}

async function verifyPreferenceToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payloadB64, signature] = parts
  const expectedSignature = await hmacSign(payloadB64, secret)
  if (signature !== expectedSignature) return null

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
// Simulate consent state logic
// ===================================

type ConsentStatus = 'OPTED_IN' | 'OPTED_OUT'
type ConsentSource = 'SELF_SERVICE' | 'STAFF' | 'IMPORT' | 'FORM'

interface ConsentRecord {
  personId: string
  channelId: string
  status: ConsentStatus
  consentSource: ConsentSource
  consentAt: Date
}

interface HistoryRecord {
  personId: string
  channelId: string
  previousStatus: ConsentStatus | null
  newStatus: ConsentStatus
  consentSource: string
  changedByUserId: string | null
  note: string | null
}

interface PersonState {
  globalUnsubscribe: number
  globalUnsubscribeSource: string | null
}

function simulateSetConsent(
  existingConsents: Map<string, ConsentRecord>,
  history: HistoryRecord[],
  personId: string,
  channelId: string,
  status: ConsentStatus,
  source: ConsentSource,
  options: { userId?: string; note?: string } = {}
): void {
  const key = `${personId}:${channelId}`
  const existing = existingConsents.get(key)
  const previousStatus = existing?.status ?? null

  existingConsents.set(key, {
    personId,
    channelId,
    status,
    consentSource: source,
    consentAt: new Date()
  })

  history.push({
    personId,
    channelId,
    previousStatus,
    newStatus: status,
    consentSource: source,
    changedByUserId: options.userId ?? null,
    note: options.note ?? null
  })
}

function simulateGlobalUnsubscribe(
  existingConsents: Map<string, ConsentRecord>,
  history: HistoryRecord[],
  personState: PersonState,
  personId: string,
  activeChannelIds: string[],
  source: 'LAWMATICS' | 'SELF_SERVICE' | 'STAFF',
  userId?: string
): void {
  personState.globalUnsubscribe = 1
  personState.globalUnsubscribeSource = source

  const consentSource = source === 'LAWMATICS' ? 'IMPORT' : source as ConsentSource

  for (const channelId of activeChannelIds) {
    const key = `${personId}:${channelId}`
    const existing = existingConsents.get(key)
    const previousStatus = existing?.status ?? null

    existingConsents.set(key, {
      personId,
      channelId,
      status: 'OPTED_OUT',
      consentSource,
      consentAt: new Date()
    })

    history.push({
      personId,
      channelId,
      previousStatus,
      newStatus: 'OPTED_OUT',
      consentSource,
      changedByUserId: userId ?? null,
      note: `Global unsubscribe via ${source}`
    })
  }
}

// ===================================
// TESTS
// ===================================

describe('Marketing Consent', () => {
  const TEST_SECRET = 'test-session-password-at-least-32-chars'

  describe('setConsent', () => {
    let consents: Map<string, ConsentRecord>
    let history: HistoryRecord[]

    beforeEach(() => {
      consents = new Map()
      history = []
    })

    it('should create a new consent record with OPTED_IN', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_IN', 'STAFF')

      const record = consents.get('person-1:channel-1')
      expect(record).toBeDefined()
      expect(record!.status).toBe('OPTED_IN')
      expect(record!.consentSource).toBe('STAFF')
    })

    it('should record history on first consent', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_IN', 'STAFF')

      expect(history).toHaveLength(1)
      expect(history[0].previousStatus).toBeNull()
      expect(history[0].newStatus).toBe('OPTED_IN')
    })

    it('should update existing consent and record previous status', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_IN', 'STAFF')
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_OUT', 'SELF_SERVICE')

      const record = consents.get('person-1:channel-1')
      expect(record!.status).toBe('OPTED_OUT')

      expect(history).toHaveLength(2)
      expect(history[1].previousStatus).toBe('OPTED_IN')
      expect(history[1].newStatus).toBe('OPTED_OUT')
    })

    it('should preserve userId in history when provided', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_IN', 'STAFF', { userId: 'admin-1' })

      expect(history[0].changedByUserId).toBe('admin-1')
    })

    it('should preserve note in history when provided', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-1', 'OPTED_OUT', 'STAFF', { note: 'Client called' })

      expect(history[0].note).toBe('Client called')
    })

    it('should handle multiple channels independently', () => {
      simulateSetConsent(consents, history, 'person-1', 'channel-a', 'OPTED_IN', 'STAFF')
      simulateSetConsent(consents, history, 'person-1', 'channel-b', 'OPTED_OUT', 'STAFF')

      expect(consents.get('person-1:channel-a')!.status).toBe('OPTED_IN')
      expect(consents.get('person-1:channel-b')!.status).toBe('OPTED_OUT')
    })
  })

  describe('globalUnsubscribe', () => {
    let consents: Map<string, ConsentRecord>
    let history: HistoryRecord[]
    let personState: PersonState

    beforeEach(() => {
      consents = new Map()
      history = []
      personState = { globalUnsubscribe: 0, globalUnsubscribeSource: null }
    })

    it('should set globalUnsubscribe flag on person', () => {
      simulateGlobalUnsubscribe(consents, history, personState, 'person-1', ['ch-1', 'ch-2'], 'STAFF')

      expect(personState.globalUnsubscribe).toBe(1)
      expect(personState.globalUnsubscribeSource).toBe('STAFF')
    })

    it('should opt out of all active channels', () => {
      // Pre-existing opt-in
      consents.set('person-1:ch-1', {
        personId: 'person-1', channelId: 'ch-1', status: 'OPTED_IN', consentSource: 'STAFF', consentAt: new Date()
      })

      simulateGlobalUnsubscribe(consents, history, personState, 'person-1', ['ch-1', 'ch-2'], 'SELF_SERVICE')

      expect(consents.get('person-1:ch-1')!.status).toBe('OPTED_OUT')
      expect(consents.get('person-1:ch-2')!.status).toBe('OPTED_OUT')
    })

    it('should record history for each channel with correct previous status', () => {
      consents.set('person-1:ch-1', {
        personId: 'person-1', channelId: 'ch-1', status: 'OPTED_IN', consentSource: 'STAFF', consentAt: new Date()
      })

      simulateGlobalUnsubscribe(consents, history, personState, 'person-1', ['ch-1', 'ch-2'], 'STAFF', 'admin-1')

      expect(history).toHaveLength(2)
      expect(history[0].previousStatus).toBe('OPTED_IN')
      expect(history[0].newStatus).toBe('OPTED_OUT')
      expect(history[1].previousStatus).toBeNull()
      expect(history[1].newStatus).toBe('OPTED_OUT')
    })

    it('should use IMPORT source when Lawmatics triggers unsubscribe', () => {
      simulateGlobalUnsubscribe(consents, history, personState, 'person-1', ['ch-1'], 'LAWMATICS')

      expect(consents.get('person-1:ch-1')!.consentSource).toBe('IMPORT')
      expect(history[0].consentSource).toBe('IMPORT')
      expect(personState.globalUnsubscribeSource).toBe('LAWMATICS')
    })

    it('should override existing opt-ins when globally unsubscribing', () => {
      // Multiple channels, some opted in
      consents.set('person-1:ch-1', {
        personId: 'person-1', channelId: 'ch-1', status: 'OPTED_IN', consentSource: 'SELF_SERVICE', consentAt: new Date()
      })
      consents.set('person-1:ch-2', {
        personId: 'person-1', channelId: 'ch-2', status: 'OPTED_IN', consentSource: 'FORM', consentAt: new Date()
      })

      simulateGlobalUnsubscribe(consents, history, personState, 'person-1', ['ch-1', 'ch-2', 'ch-3'], 'STAFF')

      expect(consents.get('person-1:ch-1')!.status).toBe('OPTED_OUT')
      expect(consents.get('person-1:ch-2')!.status).toBe('OPTED_OUT')
      expect(consents.get('person-1:ch-3')!.status).toBe('OPTED_OUT')
    })
  })

  describe('Preference Tokens', () => {
    it('should generate a valid token', async () => {
      const token = await generatePreferenceToken('person-123', TEST_SECRET)

      expect(token).toBeDefined()
      expect(token.split('.')).toHaveLength(2)
    })

    it('should round-trip: generate then verify', async () => {
      const token = await generatePreferenceToken('person-456', TEST_SECRET)
      const personId = await verifyPreferenceToken(token, TEST_SECRET)

      expect(personId).toBe('person-456')
    })

    it('should reject an expired token', async () => {
      // Generate a token that already expired (TTL = -1 second)
      const token = await generatePreferenceToken('person-789', TEST_SECRET, -1)
      const personId = await verifyPreferenceToken(token, TEST_SECRET)

      expect(personId).toBeNull()
    })

    it('should reject a token with wrong secret', async () => {
      const token = await generatePreferenceToken('person-abc', TEST_SECRET)
      const personId = await verifyPreferenceToken(token, 'wrong-secret-that-is-also-32-chars')

      expect(personId).toBeNull()
    })

    it('should reject a tampered payload', async () => {
      const token = await generatePreferenceToken('person-def', TEST_SECRET)
      const [, signature] = token.split('.')

      // Create a new payload with different personId
      const tamperedPayload = base64urlEncode(JSON.stringify({
        personId: 'person-attacker',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))

      const tamperedToken = `${tamperedPayload}.${signature}`
      const personId = await verifyPreferenceToken(tamperedToken, TEST_SECRET)

      expect(personId).toBeNull()
    })

    it('should reject a malformed token', async () => {
      expect(await verifyPreferenceToken('not-a-valid-token', TEST_SECRET)).toBeNull()
      expect(await verifyPreferenceToken('', TEST_SECRET)).toBeNull()
      expect(await verifyPreferenceToken('a.b.c', TEST_SECRET)).toBeNull()
    })

    it('should handle tokens with special characters in personId', async () => {
      const personId = 'person_abc-123/def'
      const token = await generatePreferenceToken(personId, TEST_SECRET)
      const result = await verifyPreferenceToken(token, TEST_SECRET)

      expect(result).toBe(personId)
    })
  })
})
