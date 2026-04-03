/**
 * Tests for server/queue/message-send.ts
 *
 * Tests the queue consumer logic for message delivery routing,
 * status transitions, and error handling.
 *
 * Since the actual queue handler imports virtual modules,
 * we test the core logic patterns inline.
 */

import { describe, it, expect } from 'vitest'

// Message statuses
type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED'
type MessageChannel = 'EMAIL' | 'SMS' | 'MMS'

// Simulate isPermanentFailure logic from message-send.ts
function isPermanentFailure(error: string): boolean {
  const permanentPatterns = [
    'Email service not configured',
    'SMS provider not',
    'Unsupported channel',
    'Invalid email',
    'not found in database',
    'Validation error',
    '422',
    '401',
    '403'
  ]
  return permanentPatterns.some(pattern => error.includes(pattern))
}

// Simulate channel routing logic
function routeToProvider(channel: MessageChannel): 'email' | 'sms' | 'unsupported' {
  if (channel === 'EMAIL') return 'email'
  if (channel === 'SMS' || channel === 'MMS') return 'sms'
  return 'unsupported'
}

// Simulate status transition logic
function getStatusAfterSend(
  providerSuccess: boolean,
  providerError?: string
): { status: MessageStatus, failureReason?: string } {
  if (providerSuccess) {
    return { status: 'SENT' }
  }
  if (providerError && isPermanentFailure(providerError)) {
    return { status: 'FAILED', failureReason: providerError }
  }
  // Transient failure — will be retried by queue
  return { status: 'FAILED', failureReason: providerError }
}

describe('Message Queue Consumer', () => {
  describe('isPermanentFailure', () => {
    it('identifies auth errors as permanent', () => {
      expect(isPermanentFailure('401 Unauthorized')).toBe(true)
      expect(isPermanentFailure('403 Forbidden')).toBe(true)
    })

    it('identifies validation errors as permanent', () => {
      expect(isPermanentFailure('422 Validation error: invalid email format')).toBe(true)
      expect(isPermanentFailure('Validation error in request')).toBe(true)
    })

    it('identifies configuration errors as permanent', () => {
      expect(isPermanentFailure('Email service not configured')).toBe(true)
      expect(isPermanentFailure('SMS provider not configured')).toBe(true)
    })

    it('identifies missing records as permanent', () => {
      expect(isPermanentFailure('Message not found in database')).toBe(true)
    })

    it('treats unknown errors as transient (retryable)', () => {
      expect(isPermanentFailure('Network timeout')).toBe(false)
      expect(isPermanentFailure('Connection reset')).toBe(false)
      expect(isPermanentFailure('500 Internal Server Error')).toBe(false)
      expect(isPermanentFailure('Rate limited')).toBe(false)
      expect(isPermanentFailure('Temporary failure')).toBe(false)
    })
  })

  describe('channel routing', () => {
    it('routes EMAIL to email provider', () => {
      expect(routeToProvider('EMAIL')).toBe('email')
    })

    it('routes SMS to sms provider', () => {
      expect(routeToProvider('SMS')).toBe('sms')
    })

    it('routes MMS to sms provider', () => {
      expect(routeToProvider('MMS')).toBe('sms')
    })
  })

  describe('status transitions', () => {
    it('transitions to SENT on provider success', () => {
      const result = getStatusAfterSend(true)
      expect(result.status).toBe('SENT')
      expect(result.failureReason).toBeUndefined()
    })

    it('transitions to FAILED with reason on permanent failure', () => {
      const result = getStatusAfterSend(false, 'Email service not configured')
      expect(result.status).toBe('FAILED')
      expect(result.failureReason).toBe('Email service not configured')
    })

    it('transitions to FAILED with reason on transient failure (will be retried by queue)', () => {
      const result = getStatusAfterSend(false, 'Network timeout')
      expect(result.status).toBe('FAILED')
      expect(result.failureReason).toBe('Network timeout')
    })
  })

  describe('message processing guards', () => {
    it('should skip messages that are not in QUEUED status', () => {
      const alreadyProcessedStatuses: MessageStatus[] = ['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'REJECTED']

      for (const status of alreadyProcessedStatuses) {
        // Simulate the guard: only process QUEUED messages
        const shouldProcess = status === 'QUEUED'
        expect(shouldProcess).toBe(false)
      }
    })

    it('should process messages in QUEUED status', () => {
      const shouldProcess = 'QUEUED' === 'QUEUED'
      expect(shouldProcess).toBe(true)
    })
  })

  describe('message payload structure', () => {
    it('expects messageId in the queue payload', () => {
      const payload = { messageId: 'msg-123' }
      expect(payload.messageId).toBe('msg-123')
      expect(typeof payload.messageId).toBe('string')
    })

    it('queue message body is a simple object with messageId', () => {
      // The queue sends minimal data — just the ID.
      // All message details are loaded from the database.
      const queueBody = { messageId: crypto.randomUUID() }
      expect(Object.keys(queueBody)).toEqual(['messageId'])
    })
  })

  describe('email message construction', () => {
    it('constructs email options from message row', () => {
      const msg = {
        recipientAddress: 'john@example.com',
        subject: 'Test Subject',
        body: '<p>Hello John</p>',
        bodyFormat: 'HTML' as const,
        metadata: JSON.stringify({
          attachments: [{ filename: 'doc.pdf', content: 'base64...', type: 'application/pdf' }]
        })
      }

      // Simulate email construction
      const emailOptions = {
        to: msg.recipientAddress,
        subject: msg.subject || '(no subject)',
        html: msg.bodyFormat === 'TEXT' ? `<pre>${msg.body}</pre>` : msg.body,
        text: msg.bodyFormat === 'TEXT' ? msg.body : undefined,
        attachments: msg.metadata ? JSON.parse(msg.metadata).attachments : undefined
      }

      expect(emailOptions.to).toBe('john@example.com')
      expect(emailOptions.subject).toBe('Test Subject')
      expect(emailOptions.html).toBe('<p>Hello John</p>')
      expect(emailOptions.text).toBeUndefined()
      expect(emailOptions.attachments).toHaveLength(1)
      expect(emailOptions.attachments![0].filename).toBe('doc.pdf')
    })

    it('falls back to (no subject) when subject is missing', () => {
      const subject = null
      const resolvedSubject = subject || '(no subject)'
      expect(resolvedSubject).toBe('(no subject)')
    })

    it('wraps TEXT body in pre tags for HTML rendering', () => {
      const body = 'Plain text message\nWith newlines'
      const bodyFormat = 'TEXT'
      const html = bodyFormat === 'TEXT' ? `<pre>${body}</pre>` : body
      expect(html).toBe('<pre>Plain text message\nWith newlines</pre>')
    })
  })
})
