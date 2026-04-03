/**
 * TDD Tests for message deduplication logic
 *
 * Business rule: automated messages should not be sent twice for the
 * same (contextType, contextId, templateSlug) within a time window.
 * This prevents duplicate booking confirmations, action item notifications, etc.
 */

import { describe, it, expect } from 'vitest'

interface MessageRecord {
  templateSlug: string
  contextType: string
  contextId: string
  status: string
  createdAt: Date
}

/**
 * Pure deduplication logic — determines whether a new message should be sent
 * given existing messages for the same context.
 */
function shouldSendMessage(
  existingMessages: MessageRecord[],
  templateSlug: string,
  contextType: string,
  contextId: string,
  windowMs: number = 48 * 60 * 60 * 1000 // 48 hours default
): boolean {
  const now = Date.now()

  // Find messages matching this exact context + template within the time window
  const recentMatches = existingMessages.filter(m =>
    m.templateSlug === templateSlug &&
    m.contextType === contextType &&
    m.contextId === contextId &&
    (now - m.createdAt.getTime()) < windowMs
  )

  // No recent messages — should send
  if (recentMatches.length === 0) return true

  // If all recent messages FAILED, allow retry
  const allFailed = recentMatches.every(m => m.status === 'FAILED')
  if (allFailed) return true

  // There's a recent SENT/DELIVERED/QUEUED message — don't send again
  return false
}

describe('Message Deduplication', () => {
  describe('shouldSendMessage', () => {
    const now = new Date()

    it('returns true when no prior message exists for context', () => {
      expect(shouldSendMessage(
        [],
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(true)
    })

    it('returns false when message already sent within window', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'booking-confirmation',
        contextType: 'appointment',
        contextId: 'apt-123',
        status: 'SENT',
        createdAt: new Date(now.getTime() - 1000 * 60 * 5) // 5 minutes ago
      }]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(false)
    })

    it('returns true when prior message is outside the window', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'booking-confirmation',
        contextType: 'appointment',
        contextId: 'apt-123',
        status: 'SENT',
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 72) // 72 hours ago
      }]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(true)
    })

    it('returns true when prior message was FAILED (allow retry)', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'booking-confirmation',
        contextType: 'appointment',
        contextId: 'apt-123',
        status: 'FAILED',
        createdAt: new Date(now.getTime() - 1000 * 60 * 5) // 5 minutes ago
      }]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(true)
    })

    it('returns false when any recent message was SENT even if others FAILED', () => {
      const existing: MessageRecord[] = [
        {
          templateSlug: 'booking-confirmation',
          contextType: 'appointment',
          contextId: 'apt-123',
          status: 'FAILED',
          createdAt: new Date(now.getTime() - 1000 * 60 * 10)
        },
        {
          templateSlug: 'booking-confirmation',
          contextType: 'appointment',
          contextId: 'apt-123',
          status: 'SENT',
          createdAt: new Date(now.getTime() - 1000 * 60 * 5)
        }
      ]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(false)
    })

    it('ignores messages with different templateSlug for same context', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'appointment-reminder-24h',
        contextType: 'appointment',
        contextId: 'apt-123',
        status: 'SENT',
        createdAt: new Date(now.getTime() - 1000 * 60 * 5)
      }]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(true)
    })

    it('ignores messages with different contextId', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'booking-confirmation',
        contextType: 'appointment',
        contextId: 'apt-OTHER',
        status: 'SENT',
        createdAt: new Date(now.getTime() - 1000 * 60 * 5)
      }]

      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123'
      )).toBe(true)
    })

    it('respects custom window size', () => {
      const existing: MessageRecord[] = [{
        templateSlug: 'booking-confirmation',
        contextType: 'appointment',
        contextId: 'apt-123',
        status: 'SENT',
        createdAt: new Date(now.getTime() - 1000 * 60 * 30) // 30 minutes ago
      }]

      // 1 hour window — 30 min ago is within window
      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123',
        1000 * 60 * 60
      )).toBe(false)

      // 10 minute window — 30 min ago is outside window
      expect(shouldSendMessage(
        existing,
        'booking-confirmation',
        'appointment',
        'apt-123',
        1000 * 60 * 10
      )).toBe(true)
    })

    it('treats QUEUED and DELIVERED as sent (do not resend)', () => {
      for (const status of ['QUEUED', 'SENT', 'DELIVERED', 'SENDING']) {
        const existing: MessageRecord[] = [{
          templateSlug: 'booking-confirmation',
          contextType: 'appointment',
          contextId: 'apt-123',
          status,
          createdAt: new Date(now.getTime() - 1000 * 60 * 5)
        }]

        expect(shouldSendMessage(
          existing,
          'booking-confirmation',
          'appointment',
          'apt-123'
        )).toBe(false)
      }
    })
  })
})
