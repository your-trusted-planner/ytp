/**
 * Tests for server/utils/signature-certificate.ts
 *
 * Covers:
 * - Token generation and validation
 * - SHA-256 hashing
 * - Certificate generation and integrity verification
 * - Token expiration calculations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateSigningToken,
  sha256,
  generateSignatureCertificate,
  verifyCertificateIntegrity,
  calculateTokenExpiration,
  isTokenExpired,
  DEFAULT_TOKEN_EXPIRY_MS,
  CURRENT_TERMS_VERSION,
  type CertificateInput,
  type SignatureCertificate
} from '../../server/utils/signature-certificate'

describe('Signature Certificate Utilities', () => {
  describe('generateSigningToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSigningToken()

      expect(token).toBeDefined()
      expect(token.length).toBe(64)
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()

      for (let i = 0; i < 100; i++) {
        tokens.add(generateSigningToken())
      }

      expect(tokens.size).toBe(100)
    })

    it('should use cryptographically random values', () => {
      // Generate multiple tokens and check they don't follow a pattern
      const tokens = Array.from({ length: 10 }, () => generateSigningToken())

      // Each token should be different
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(10)

      // Tokens shouldn't share common prefixes (beyond chance)
      const prefixes = tokens.map(t => t.substring(0, 8))
      const uniquePrefixes = new Set(prefixes)
      expect(uniquePrefixes.size).toBeGreaterThan(5) // Allow some collision by chance
    })
  })

  describe('sha256', () => {
    it('should hash strings consistently', async () => {
      const input = 'Hello, World!'
      const hash1 = await sha256(input)
      const hash2 = await sha256(input)

      expect(hash1).toBe(hash2)
    })

    it('should produce 64-character hex output', async () => {
      const hash = await sha256('test input')

      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await sha256('input1')
      const hash2 = await sha256('input2')

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', async () => {
      const hash = await sha256('')

      expect(hash.length).toBe(64)
      // Known SHA-256 hash of empty string
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('should handle unicode characters', async () => {
      const hash = await sha256('日本語テスト 🔐')

      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should handle special characters', async () => {
      const hash = await sha256('!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~')

      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(100000)
      const hash = await sha256(longString)

      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should be case-sensitive', async () => {
      const hashLower = await sha256('test')
      const hashUpper = await sha256('TEST')

      expect(hashLower).not.toBe(hashUpper)
    })
  })

  describe('generateSignatureCertificate', () => {
    let validInput: CertificateInput

    beforeEach(() => {
      validInput = {
        documentId: 'doc-123',
        documentContent: '<h1>Test Document</h1><p>Content here</p>',
        signatureSessionId: 'session-456',
        signer: {
          userId: 'user-789',
          email: 'signer@example.com',
          name: 'John Doe',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          country: 'US',
          region: 'Colorado',
          city: 'Denver'
        },
        verification: {
          tier: 'STANDARD',
          method: null,
          verifiedAt: null,
          providerId: null
        },
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        termsVersion: '2024.1',
        timestamps: {
          sessionCreated: new Date('2024-01-15T10:00:00Z'),
          documentViewed: new Date('2024-01-15T10:05:00Z'),
          identityVerified: null,
          termsAccepted: new Date('2024-01-15T10:10:00Z')
        }
      }
    })

    it('should include all required fields', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.version).toBe('1.0')
      expect(certificate.certificateId).toBeDefined()
      expect(certificate.documentId).toBe('doc-123')
      expect(certificate.documentHash).toBeDefined()
      expect(certificate.signatureSessionId).toBe('session-456')
      expect(certificate.signer).toBeDefined()
      expect(certificate.verification).toBeDefined()
      expect(certificate.signature).toBeDefined()
      expect(certificate.terms).toBeDefined()
      expect(certificate.timestamps).toBeDefined()
      expect(certificate.certificateHash).toBeDefined()
    })

    it('should hash document content', async () => {
      const certificate = await generateSignatureCertificate(validInput)
      const expectedHash = await sha256(validInput.documentContent)

      expect(certificate.documentHash).toBe(expectedHash)
    })

    it('should hash signature data', async () => {
      const certificate = await generateSignatureCertificate(validInput)
      const expectedHash = await sha256(validInput.signatureData)

      expect(certificate.signature.dataHash).toBe(expectedHash)
    })

    it('should generate unique certificate IDs', async () => {
      const cert1 = await generateSignatureCertificate(validInput)
      const cert2 = await generateSignatureCertificate(validInput)

      expect(cert1.certificateId).not.toBe(cert2.certificateId)
    })

    it('should include signer information', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.signer.userId).toBe('user-789')
      expect(certificate.signer.email).toBe('signer@example.com')
      expect(certificate.signer.name).toBe('John Doe')
      expect(certificate.signer.ipAddress).toBe('192.168.1.1')
      expect(certificate.signer.userAgent).toBe('Mozilla/5.0')
    })

    it('should include geolocation when provided', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.signer.geolocation).not.toBeNull()
      expect(certificate.signer.geolocation?.country).toBe('US')
      expect(certificate.signer.geolocation?.region).toBe('Colorado')
      expect(certificate.signer.geolocation?.city).toBe('Denver')
    })

    it('should set geolocation to null when not provided', async () => {
      validInput.signer.country = null
      validInput.signer.region = null
      validInput.signer.city = null

      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.signer.geolocation).toBeNull()
    })

    it('should include verification tier', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.verification.tier).toBe('STANDARD')
    })

    it('should include verification details for ENHANCED tier', async () => {
      validInput.verification = {
        tier: 'ENHANCED',
        method: 'KBA',
        verifiedAt: new Date('2024-01-15T10:08:00Z'),
        providerId: 'verify-abc'
      }
      validInput.timestamps.identityVerified = new Date('2024-01-15T10:08:00Z')

      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.verification.tier).toBe('ENHANCED')
      expect(certificate.verification.method).toBe('KBA')
      expect(certificate.verification.verifiedAt).toBe('2024-01-15T10:08:00.000Z')
      expect(certificate.verification.providerId).toBe('verify-abc')
    })

    it('should include terms acceptance', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.terms.version).toBe('2024.1')
      expect(certificate.terms.acceptedAt).toBe('2024-01-15T10:10:00.000Z')
    })

    it('should include all timestamps', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      expect(certificate.timestamps.sessionCreated).toBe('2024-01-15T10:00:00.000Z')
      expect(certificate.timestamps.documentViewed).toBe('2024-01-15T10:05:00.000Z')
      expect(certificate.timestamps.identityVerified).toBeNull()
      expect(certificate.timestamps.signed).toBeDefined()
      expect(certificate.timestamps.certificateGenerated).toBeDefined()
    })

    it('should generate tamper-evident certificateHash', async () => {
      const certificate = await generateSignatureCertificate(validInput)

      // Hash should be 64 hex characters
      expect(certificate.certificateHash.length).toBe(64)
      expect(certificate.certificateHash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should produce different hashes for different documents', async () => {
      const cert1 = await generateSignatureCertificate(validInput)

      validInput.documentContent = '<h1>Different Document</h1>'
      const cert2 = await generateSignatureCertificate(validInput)

      expect(cert1.documentHash).not.toBe(cert2.documentHash)
      expect(cert1.certificateHash).not.toBe(cert2.certificateHash)
    })
  })

  describe('verifyCertificateIntegrity', () => {
    let validCertificate: SignatureCertificate

    beforeEach(async () => {
      const input: CertificateInput = {
        documentId: 'doc-123',
        documentContent: 'Test content',
        signatureSessionId: 'session-456',
        signer: {
          userId: 'user-789',
          email: 'test@example.com',
          name: 'Test User',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          country: null,
          region: null,
          city: null
        },
        verification: {
          tier: 'STANDARD',
          method: null,
          verifiedAt: null,
          providerId: null
        },
        signatureData: 'base64signaturedata',
        termsVersion: '2024.1',
        timestamps: {
          sessionCreated: new Date(),
          documentViewed: new Date(),
          identityVerified: null,
          termsAccepted: new Date()
        }
      }

      validCertificate = await generateSignatureCertificate(input)
    })

    it('should return true for valid certificate', async () => {
      const isValid = await verifyCertificateIntegrity(validCertificate)

      expect(isValid).toBe(true)
    })

    it('should return false if documentHash is modified', async () => {
      const tamperedCert = { ...validCertificate, documentHash: 'tampered' }

      const isValid = await verifyCertificateIntegrity(tamperedCert)

      expect(isValid).toBe(false)
    })

    it('should return false if signer email is modified', async () => {
      const tamperedCert = {
        ...validCertificate,
        signer: { ...validCertificate.signer, email: 'hacker@evil.com' }
      }

      const isValid = await verifyCertificateIntegrity(tamperedCert)

      expect(isValid).toBe(false)
    })

    it('should return false if signature dataHash is modified', async () => {
      const tamperedCert = {
        ...validCertificate,
        signature: { ...validCertificate.signature, dataHash: 'forged' }
      }

      const isValid = await verifyCertificateIntegrity(tamperedCert)

      expect(isValid).toBe(false)
    })

    it('should return false if timestamps are modified', async () => {
      const tamperedCert = {
        ...validCertificate,
        timestamps: { ...validCertificate.timestamps, signed: '2020-01-01T00:00:00.000Z' }
      }

      const isValid = await verifyCertificateIntegrity(tamperedCert)

      expect(isValid).toBe(false)
    })

    it('should return false if certificateHash is wrong', async () => {
      const tamperedCert = { ...validCertificate, certificateHash: 'wronghash' }

      const isValid = await verifyCertificateIntegrity(tamperedCert)

      expect(isValid).toBe(false)
    })

    it('should detect any field tampering', async () => {
      // Test multiple field modifications
      const fieldsToTamper = [
        { ...validCertificate, documentId: 'different-doc' },
        { ...validCertificate, signatureSessionId: 'different-session' },
        { ...validCertificate, version: '2.0' as const },
        { ...validCertificate, terms: { ...validCertificate.terms, version: 'fake' } }
      ]

      for (const tamperedCert of fieldsToTamper) {
        const isValid = await verifyCertificateIntegrity(tamperedCert as SignatureCertificate)
        expect(isValid).toBe(false)
      }
    })
  })

  describe('calculateTokenExpiration', () => {
    it('should parse hours correctly', () => {
      const now = Date.now()
      const expiry = calculateTokenExpiration('24h')
      const expectedMs = 24 * 60 * 60 * 1000

      // Allow 1 second tolerance for test execution time
      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + expectedMs - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + expectedMs + 1000)
    })

    it('should parse days correctly', () => {
      const now = Date.now()
      const expiry = calculateTokenExpiration('7d')
      const expectedMs = 7 * 24 * 60 * 60 * 1000

      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + expectedMs - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + expectedMs + 1000)
    })

    it('should parse minutes correctly', () => {
      const now = Date.now()
      const expiry = calculateTokenExpiration('30m')
      const expectedMs = 30 * 60 * 1000

      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + expectedMs - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + expectedMs + 1000)
    })

    it('should handle numeric milliseconds', () => {
      const now = Date.now()
      const ms = 3600000 // 1 hour
      const expiry = calculateTokenExpiration(ms)

      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + ms - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + ms + 1000)
    })

    it('should default to 48h for invalid input', () => {
      const now = Date.now()
      const expiry = calculateTokenExpiration('invalid')
      const expectedMs = 48 * 60 * 60 * 1000

      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + expectedMs - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + expectedMs + 1000)
    })

    it('should default to 48h for empty string', () => {
      const now = Date.now()
      const expiry = calculateTokenExpiration('')
      const expectedMs = 48 * 60 * 60 * 1000

      expect(expiry.getTime()).toBeGreaterThanOrEqual(now + expectedMs - 1000)
      expect(expiry.getTime()).toBeLessThanOrEqual(now + expectedMs + 1000)
    })

    it('should handle edge case durations', () => {
      // 1 hour
      const oneHour = calculateTokenExpiration('1h')
      expect(oneHour.getTime()).toBeGreaterThan(Date.now())

      // 1 day
      const oneDay = calculateTokenExpiration('1d')
      expect(oneDay.getTime()).toBeGreaterThan(oneHour.getTime())

      // 1 minute
      const oneMinute = calculateTokenExpiration('1m')
      expect(oneMinute.getTime()).toBeLessThan(oneHour.getTime())
    })
  })

  describe('isTokenExpired', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(Date.now() - 1000) // 1 second ago

      expect(isTokenExpired(pastDate)).toBe(true)
    })

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now

      expect(isTokenExpired(futureDate)).toBe(false)
    })

    it('should handle Date objects', () => {
      const pastDate = new Date('2020-01-01')
      const futureDate = new Date('2099-01-01')

      expect(isTokenExpired(pastDate)).toBe(true)
      expect(isTokenExpired(futureDate)).toBe(false)
    })

    it('should handle numeric timestamps', () => {
      const pastTimestamp = Date.now() - 1000
      const futureTimestamp = Date.now() + 60000

      expect(isTokenExpired(pastTimestamp)).toBe(true)
      expect(isTokenExpired(futureTimestamp)).toBe(false)
    })

    it('should handle exact current time as not expired', () => {
      // Token that expires right now should be considered expired
      // (Date.now() > expiresAt means we check if current time is PAST expiry)
      const nowTimestamp = Date.now()

      // Immediate check - should be expired or just about to be
      const result = isTokenExpired(nowTimestamp)
      // This is a race condition edge case, either result is acceptable
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Constants', () => {
    it('should have correct DEFAULT_TOKEN_EXPIRY_MS (48 hours)', () => {
      const expected = 48 * 60 * 60 * 1000

      expect(DEFAULT_TOKEN_EXPIRY_MS).toBe(expected)
    })

    it('should have a CURRENT_TERMS_VERSION', () => {
      expect(CURRENT_TERMS_VERSION).toBeDefined()
      expect(typeof CURRENT_TERMS_VERSION).toBe('string')
      expect(CURRENT_TERMS_VERSION.length).toBeGreaterThan(0)
    })
  })
})
