/**
 * Tests for server/utils/zoom-phone-sms.ts
 *
 * Covers the pure helper functions (error classification, request building,
 * response parsing). The impure DB/KV/HTTP functions are tested via the
 * queue consumer integration tests.
 */

import { describe, it, expect } from 'vitest'
import {
  classifyZoomPhoneError,
  buildSendSmsBody,
  parseSendSmsResponse,
  ZoomPhoneApiError
} from '../../../server/utils/zoom-phone-sms'

describe('Zoom Phone SMS Client', () => {
  describe('classifyZoomPhoneError', () => {
    it('classifies 429 rate limit as transient', () => {
      expect(classifyZoomPhoneError(429, 'Too Many Requests')).toBe('transient')
    })

    it('classifies 5xx server errors as transient', () => {
      expect(classifyZoomPhoneError(500, 'Internal Server Error')).toBe('transient')
      expect(classifyZoomPhoneError(502, 'Bad Gateway')).toBe('transient')
      expect(classifyZoomPhoneError(503, 'Service Unavailable')).toBe('transient')
      expect(classifyZoomPhoneError(504, 'Gateway Timeout')).toBe('transient')
    })

    it('classifies 401 unauthorized as transient (token may have expired mid-request)', () => {
      expect(classifyZoomPhoneError(401, 'Unauthorized')).toBe('transient')
    })

    it('classifies 400 invalid phone number as permanent', () => {
      expect(classifyZoomPhoneError(400, JSON.stringify({ code: 300, message: 'Invalid phone number' }))).toBe('permanent')
    })

    it('classifies 403 forbidden (e.g. 10DLC not approved) as permanent', () => {
      expect(classifyZoomPhoneError(403, 'Forbidden')).toBe('permanent')
    })

    it('classifies 404 not found as permanent', () => {
      expect(classifyZoomPhoneError(404, 'Not Found')).toBe('permanent')
    })

    it('classifies Zoom error code 10DLC-related messages as permanent', () => {
      expect(classifyZoomPhoneError(400, 'Campaign not approved for 10DLC')).toBe('permanent')
      expect(classifyZoomPhoneError(400, 'Phone number not registered in an active campaign')).toBe('permanent')
    })

    it('classifies unknown 4xx as permanent by default', () => {
      expect(classifyZoomPhoneError(418, "I'm a teapot")).toBe('permanent')
    })
  })

  describe('buildSendSmsBody', () => {
    it('builds the flat send request payload for POST /phone/sms/messages', () => {
      const body = buildSendSmsBody({
        fromPhoneNumber: '+15551234567',
        to: '+13035557890',
        content: 'Hello from Your Trusted Planner'
      })

      expect(body.to).toBe('+13035557890')
      expect(body.from).toBe('+15551234567')
      expect(body.content).toBe('Hello from Your Trusted Planner')
    })

    it('truncates content to SMS limit if requested', () => {
      const longContent = 'a'.repeat(2000)
      const body = buildSendSmsBody({
        fromPhoneNumber: '+15551234567',
        to: '+13035557890',
        content: longContent,
        maxLength: 1600
      })

      expect(body.content.length).toBe(1600)
    })

    it('does not truncate when maxLength not provided', () => {
      const longContent = 'a'.repeat(2000)
      const body = buildSendSmsBody({
        fromPhoneNumber: '+15551234567',
        to: '+13035557890',
        content: longContent
      })

      expect(body.content.length).toBe(2000)
    })
  })

  describe('parseSendSmsResponse', () => {
    it('extracts the message ID from a successful response', () => {
      const response = { id: 'msg_abc123xyz' }
      expect(parseSendSmsResponse(response)).toBe('msg_abc123xyz')
    })

    it('extracts message ID from alternative field name "message_id"', () => {
      const response = { message_id: 'msg_xyz789' }
      expect(parseSendSmsResponse(response)).toBe('msg_xyz789')
    })

    it('throws when no ID is present', () => {
      expect(() => parseSendSmsResponse({})).toThrow(ZoomPhoneApiError)
    })

    it('throws when response is null or undefined', () => {
      expect(() => parseSendSmsResponse(null)).toThrow(ZoomPhoneApiError)
      expect(() => parseSendSmsResponse(undefined)).toThrow(ZoomPhoneApiError)
    })
  })

  describe('ZoomPhoneApiError', () => {
    it('carries status code and classification', () => {
      const err = new ZoomPhoneApiError('Rate limited', 429, 'transient')
      expect(err.message).toBe('Rate limited')
      expect(err.statusCode).toBe(429)
      expect(err.classification).toBe('transient')
      expect(err.name).toBe('ZoomPhoneApiError')
    })

    it('is an Error instance', () => {
      const err = new ZoomPhoneApiError('Nope', 400, 'permanent')
      expect(err instanceof Error).toBe(true)
    })
  })
})
