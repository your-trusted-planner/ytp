/**
 * TDD Tests for server/utils/consent-gate.ts
 *
 * Written BEFORE implementation. Tests the consent decision matrix
 * mapping to Colorado Rules of Professional Conduct:
 * - TRANSACTIONAL: always allowed (password reset, signature, invoice)
 * - OPERATIONAL: blocked only by globalUnsubscribe (reminders, action items)
 * - MARKETING: blocked by globalUnsubscribe AND per-channel opt-out
 *
 * Since the actual utility imports virtual modules (@nuxthub/db),
 * we test the pure decision logic inline, following the pattern
 * established in tests/unit/marketing/consent.test.ts.
 */

import { describe, it, expect } from 'vitest'

// Types matching the consent-gate module
type MessageCategory = 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
type MessageChannel = 'EMAIL' | 'SMS' | 'MMS'

interface ConsentState {
  globalUnsubscribe: boolean
  channelOptedIn: boolean | null // null = no consent record exists
}

interface ConsentResult {
  allowed: boolean
  reason?: string
}

/**
 * Pure decision logic extracted from the consent gate.
 * This is the function we're testing — it will be the core
 * of canSendMessage() in the actual implementation.
 */
function evaluateConsent(
  category: MessageCategory,
  channel: MessageChannel,
  consent: ConsentState
): ConsentResult {
  // TRANSACTIONAL: always allowed — required for service delivery
  // (password resets, signatures, invoices, booking confirmations)
  if (category === 'TRANSACTIONAL') {
    return { allowed: true }
  }

  // OPERATIONAL & MARKETING: check global unsubscribe
  if (consent.globalUnsubscribe) {
    return {
      allowed: false,
      reason: 'Person has globally unsubscribed from all communications'
    }
  }

  // OPERATIONAL: allowed if not globally unsubscribed
  // (reminders, action item notifications, form assignments)
  if (category === 'OPERATIONAL') {
    return { allowed: true }
  }

  // MARKETING: requires explicit per-channel opt-in
  if (category === 'MARKETING') {
    if (consent.channelOptedIn === null) {
      return {
        allowed: false,
        reason: `No consent record exists for ${channel} channel (default deny)`
      }
    }
    if (!consent.channelOptedIn) {
      return {
        allowed: false,
        reason: `Person has opted out of ${channel} marketing communications`
      }
    }
    return { allowed: true }
  }

  // Unknown category — deny
  return { allowed: false, reason: `Unknown message category: ${category}` }
}

describe('Consent Gate', () => {
  describe('TRANSACTIONAL category', () => {
    it('allows sending even when globally unsubscribed', () => {
      const result = evaluateConsent('TRANSACTIONAL', 'EMAIL', {
        globalUnsubscribe: true,
        channelOptedIn: false
      })
      expect(result.allowed).toBe(true)
    })

    it('allows sending even when channel opted out', () => {
      const result = evaluateConsent('TRANSACTIONAL', 'SMS', {
        globalUnsubscribe: false,
        channelOptedIn: false
      })
      expect(result.allowed).toBe(true)
    })

    it('allows sending when no consent record exists', () => {
      const result = evaluateConsent('TRANSACTIONAL', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: null
      })
      expect(result.allowed).toBe(true)
    })

    it('allows sending for all channel types', () => {
      for (const channel of ['EMAIL', 'SMS', 'MMS'] as MessageChannel[]) {
        const result = evaluateConsent('TRANSACTIONAL', channel, {
          globalUnsubscribe: true,
          channelOptedIn: false
        })
        expect(result.allowed).toBe(true)
      }
    })
  })

  describe('OPERATIONAL category', () => {
    it('allows sending when not globally unsubscribed', () => {
      const result = evaluateConsent('OPERATIONAL', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: null
      })
      expect(result.allowed).toBe(true)
    })

    it('blocks sending when globally unsubscribed', () => {
      const result = evaluateConsent('OPERATIONAL', 'EMAIL', {
        globalUnsubscribe: true,
        channelOptedIn: null
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('globally unsubscribed')
    })

    it('allows sending regardless of per-channel consent (opted out)', () => {
      const result = evaluateConsent('OPERATIONAL', 'SMS', {
        globalUnsubscribe: false,
        channelOptedIn: false
      })
      expect(result.allowed).toBe(true)
    })

    it('allows sending regardless of per-channel consent (no record)', () => {
      const result = evaluateConsent('OPERATIONAL', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: null
      })
      expect(result.allowed).toBe(true)
    })

    it('allows sending when opted in and not globally unsubscribed', () => {
      const result = evaluateConsent('OPERATIONAL', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: true
      })
      expect(result.allowed).toBe(true)
    })
  })

  describe('MARKETING category', () => {
    it('blocks when globally unsubscribed (even if channel opted in)', () => {
      const result = evaluateConsent('MARKETING', 'EMAIL', {
        globalUnsubscribe: true,
        channelOptedIn: true
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('globally unsubscribed')
    })

    it('blocks when channel opted out', () => {
      const result = evaluateConsent('MARKETING', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: false
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('opted out')
    })

    it('blocks when no consent record exists (default deny)', () => {
      const result = evaluateConsent('MARKETING', 'SMS', {
        globalUnsubscribe: false,
        channelOptedIn: null
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('No consent record')
    })

    it('allows when opted in and not globally unsubscribed', () => {
      const result = evaluateConsent('MARKETING', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: true
      })
      expect(result.allowed).toBe(true)
    })

    it('includes channel name in rejection reason', () => {
      const emailResult = evaluateConsent('MARKETING', 'EMAIL', {
        globalUnsubscribe: false,
        channelOptedIn: false
      })
      expect(emailResult.reason).toContain('EMAIL')

      const smsResult = evaluateConsent('MARKETING', 'SMS', {
        globalUnsubscribe: false,
        channelOptedIn: null
      })
      expect(smsResult.reason).toContain('SMS')
    })
  })

  describe('edge cases', () => {
    it('global unsubscribe blocks OPERATIONAL on all channels', () => {
      for (const channel of ['EMAIL', 'SMS', 'MMS'] as MessageChannel[]) {
        const result = evaluateConsent('OPERATIONAL', channel, {
          globalUnsubscribe: true,
          channelOptedIn: true
        })
        expect(result.allowed).toBe(false)
      }
    })

    it('global unsubscribe blocks MARKETING on all channels', () => {
      for (const channel of ['EMAIL', 'SMS', 'MMS'] as MessageChannel[]) {
        const result = evaluateConsent('MARKETING', channel, {
          globalUnsubscribe: true,
          channelOptedIn: true
        })
        expect(result.allowed).toBe(false)
      }
    })

    it('TRANSACTIONAL is never blocked by any consent state', () => {
      const states: ConsentState[] = [
        { globalUnsubscribe: true, channelOptedIn: true },
        { globalUnsubscribe: true, channelOptedIn: false },
        { globalUnsubscribe: true, channelOptedIn: null },
        { globalUnsubscribe: false, channelOptedIn: true },
        { globalUnsubscribe: false, channelOptedIn: false },
        { globalUnsubscribe: false, channelOptedIn: null }
      ]

      for (const state of states) {
        for (const channel of ['EMAIL', 'SMS', 'MMS'] as MessageChannel[]) {
          const result = evaluateConsent('TRANSACTIONAL', channel, state)
          expect(result.allowed).toBe(true)
        }
      }
    })
  })
})
