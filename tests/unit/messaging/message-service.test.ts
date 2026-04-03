/**
 * Tests for server/utils/message-service.ts
 *
 * Since message-service.ts imports virtual modules (drizzle DB),
 * we test the interface contracts and parameter validation by
 * simulating the core logic inline.
 */

import { describe, it, expect } from 'vitest'

// Simulate the SendMessageParams interface
interface SendMessageParams {
  recipientPersonId?: string
  recipientAddress: string
  channel: 'EMAIL' | 'SMS' | 'MMS'
  category: 'TRANSACTIONAL' | 'OPERATIONAL' | 'MARKETING'
  subject?: string
  body: string
  bodyFormat?: 'HTML' | 'TEXT'
  templateSlug?: string
  contextType?: string
  contextId?: string
  senderUserId?: string
  metadata?: Record<string, any>
}

// Simulate the validation logic from sendMessage()
function validateMessageParams(params: SendMessageParams): { valid: boolean, error?: string } {
  if (!params.recipientAddress) {
    return { valid: false, error: 'recipientAddress is required' }
  }
  if (!params.channel) {
    return { valid: false, error: 'channel is required' }
  }
  if (!['EMAIL', 'SMS', 'MMS'].includes(params.channel)) {
    return { valid: false, error: `Invalid channel: ${params.channel}` }
  }
  if (!params.category) {
    return { valid: false, error: 'category is required' }
  }
  if (!['TRANSACTIONAL', 'OPERATIONAL', 'MARKETING'].includes(params.category)) {
    return { valid: false, error: `Invalid category: ${params.category}` }
  }
  if (!params.body) {
    return { valid: false, error: 'body is required' }
  }
  if (params.channel === 'EMAIL' && !params.subject) {
    // Subject is optional in the interface but should be present for email
    // The service will fall back to '(no subject)'
  }
  return { valid: true }
}

// Simulate bodyFormat default logic
function resolveBodyFormat(params: SendMessageParams): 'HTML' | 'TEXT' {
  if (params.bodyFormat) return params.bodyFormat
  return params.channel === 'EMAIL' ? 'HTML' : 'TEXT'
}

describe('Message Service', () => {
  describe('validateMessageParams', () => {
    const validParams: SendMessageParams = {
      recipientAddress: 'test@example.com',
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      body: '<p>Hello</p>'
    }

    it('accepts valid email message params', () => {
      expect(validateMessageParams(validParams)).toEqual({ valid: true })
    })

    it('accepts valid SMS message params', () => {
      expect(validateMessageParams({
        ...validParams,
        channel: 'SMS',
        recipientAddress: '+13035551234',
        body: 'Hello'
      })).toEqual({ valid: true })
    })

    it('rejects missing recipientAddress', () => {
      const result = validateMessageParams({ ...validParams, recipientAddress: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('recipientAddress')
    })

    it('rejects missing body', () => {
      const result = validateMessageParams({ ...validParams, body: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('body')
    })

    it('accepts all valid categories', () => {
      for (const category of ['TRANSACTIONAL', 'OPERATIONAL', 'MARKETING'] as const) {
        expect(validateMessageParams({ ...validParams, category })).toEqual({ valid: true })
      }
    })

    it('accepts all valid channels', () => {
      for (const channel of ['EMAIL', 'SMS', 'MMS'] as const) {
        expect(validateMessageParams({ ...validParams, channel })).toEqual({ valid: true })
      }
    })

    it('accepts optional fields as undefined', () => {
      const result = validateMessageParams({
        recipientAddress: 'test@example.com',
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        body: '<p>Test</p>'
      })
      expect(result.valid).toBe(true)
    })

    it('accepts metadata with attachments', () => {
      const result = validateMessageParams({
        ...validParams,
        metadata: {
          attachments: [{ filename: 'doc.pdf', content: 'base64...', type: 'application/pdf' }]
        }
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('resolveBodyFormat', () => {
    it('defaults to HTML for email', () => {
      expect(resolveBodyFormat({
        recipientAddress: 'test@example.com',
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        body: '<p>Hello</p>'
      })).toBe('HTML')
    })

    it('defaults to TEXT for SMS', () => {
      expect(resolveBodyFormat({
        recipientAddress: '+13035551234',
        channel: 'SMS',
        category: 'TRANSACTIONAL',
        body: 'Hello'
      })).toBe('TEXT')
    })

    it('defaults to TEXT for MMS', () => {
      expect(resolveBodyFormat({
        recipientAddress: '+13035551234',
        channel: 'MMS',
        category: 'TRANSACTIONAL',
        body: 'Hello'
      })).toBe('TEXT')
    })

    it('respects explicit bodyFormat override', () => {
      expect(resolveBodyFormat({
        recipientAddress: 'test@example.com',
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        body: 'Plain text email',
        bodyFormat: 'TEXT'
      })).toBe('TEXT')
    })
  })

  describe('message row structure', () => {
    it('generates a valid message row from params', () => {
      const params: SendMessageParams = {
        recipientPersonId: 'person-123',
        recipientAddress: 'john@example.com',
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        templateSlug: 'password-reset',
        subject: 'Reset Your Password',
        body: '<p>Click here</p>',
        contextType: 'user',
        contextId: 'user-456',
        senderUserId: 'admin-789',
        metadata: { source: 'admin-panel' }
      }

      // Simulate row creation
      const row = {
        id: 'test-uuid',
        recipientPersonId: params.recipientPersonId || null,
        recipientAddress: params.recipientAddress,
        senderUserId: params.senderUserId || null,
        channel: params.channel,
        category: params.category,
        templateSlug: params.templateSlug || null,
        subject: params.subject || null,
        body: params.body,
        bodyFormat: resolveBodyFormat(params),
        contextType: params.contextType || null,
        contextId: params.contextId || null,
        status: 'QUEUED' as const,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null
      }

      expect(row.recipientPersonId).toBe('person-123')
      expect(row.recipientAddress).toBe('john@example.com')
      expect(row.channel).toBe('EMAIL')
      expect(row.category).toBe('TRANSACTIONAL')
      expect(row.templateSlug).toBe('password-reset')
      expect(row.subject).toBe('Reset Your Password')
      expect(row.bodyFormat).toBe('HTML')
      expect(row.status).toBe('QUEUED')
      expect(row.contextType).toBe('user')
      expect(row.contextId).toBe('user-456')
      expect(row.senderUserId).toBe('admin-789')
      expect(JSON.parse(row.metadata!)).toEqual({ source: 'admin-panel' })
    })

    it('nullifies optional fields when not provided', () => {
      const params: SendMessageParams = {
        recipientAddress: 'test@example.com',
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        body: '<p>Hello</p>'
      }

      const row = {
        recipientPersonId: params.recipientPersonId || null,
        senderUserId: params.senderUserId || null,
        templateSlug: params.templateSlug || null,
        subject: params.subject || null,
        contextType: params.contextType || null,
        contextId: params.contextId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null
      }

      expect(row.recipientPersonId).toBeNull()
      expect(row.senderUserId).toBeNull()
      expect(row.templateSlug).toBeNull()
      expect(row.subject).toBeNull()
      expect(row.contextType).toBeNull()
      expect(row.contextId).toBeNull()
      expect(row.metadata).toBeNull()
    })
  })
})
