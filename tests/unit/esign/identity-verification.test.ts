/**
 * Tests for server/utils/identity-verification.ts
 *
 * Covers:
 * - Attestation verification
 * - Knowledge-based authentication (KBA)
 * - Manual ID review submission
 * - Helper functions
 */

import { describe, it, expect } from 'vitest'
import {
  verifyByAttestation,
  verifyByKba,
  submitForManualReview,
  getAttestationText,
  getVerificationRequirements,
  getActivityTypeForMode,
  type AttestationRequest,
  type KbaRequest,
  type ManualRequest,
  type VerificationMode
} from '../../../server/utils/identity-verification'

describe('Identity Verification Utilities', () => {
  describe('verifyByAttestation', () => {
    it('should require agreedToTerms', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: 'I, John Doe, hereby attest under penalty of perjury...',
        agreedToTerms: false
      }

      const result = await verifyByAttestation(request, 'John Doe')

      expect(result.success).toBe(false)
      expect(result.method).toBe('attestation')
      expect(result.error).toContain('agree')
    })

    it('should require minimum attestation text length', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: 'Short',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'John Doe')

      expect(result.success).toBe(false)
      expect(result.error).toContain('attestation text')
    })

    it('should reject empty attestation text', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: '',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'John Doe')

      expect(result.success).toBe(false)
    })

    it('should return success with valid attestation', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: 'I, John Doe, hereby attest under penalty of perjury that I am the person named in this document.',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'John Doe')

      expect(result.success).toBe(true)
      expect(result.method).toBe('attestation')
      expect(result.error).toBeUndefined()
    })

    it('should include metadata on success', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: 'I, Jane Smith, hereby attest under penalty of perjury...',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'Jane Smith')

      expect(result.metadata).toBeDefined()
      expect(result.metadata?.attestationType).toBe('SELF_ATTESTATION')
      expect(result.metadata?.attestationText).toBe(request.attestationText)
      expect(result.metadata?.attestedAt).toBeDefined()
      expect(result.metadata?.signerName).toBe('Jane Smith')
    })

    it('should include ISO timestamp in metadata', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: 'Valid attestation text here for testing purposes',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'Test User')

      expect(result.metadata?.attestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('verifyByKba', () => {
    describe('Date of Birth Validation', () => {
      it('should require date of birth', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: ''
        }

        const result = await verifyByKba(request, { dateOfBirth: '1990-05-15' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Date of birth')
      })

      it('should match DOB against stored data', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15'
        }

        const result = await verifyByKba(request, { dateOfBirth: '1990-05-15' })

        expect(result.success).toBe(true)
      })

      it('should fail when DOB does not match', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15'
        }

        const result = await verifyByKba(request, { dateOfBirth: '1985-03-20' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('does not match')
      })

      it('should handle date formats with timestamps', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15T00:00:00.000Z'
        }

        const result = await verifyByKba(request, { dateOfBirth: '1990-05-15' })

        expect(result.success).toBe(true)
      })

      it('should pass when no stored DOB to compare', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15'
        }

        const result = await verifyByKba(request, {})

        expect(result.success).toBe(true)
      })
    })

    describe('SSN Validation', () => {
      it('should match last 4 SSN when provided', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        })

        expect(result.success).toBe(true)
      })

      it('should fail when SSN does not match', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15',
          lastFourSsn: '5678'
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('SSN')
      })

      it('should normalize SSN by removing non-digits', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '12-34'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        })

        expect(result.success).toBe(true)
      })

      it('should skip SSN check when not stored', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15'
          // No lastFourSsn stored
        })

        expect(result.success).toBe(true)
      })

      it('should skip SSN check when not provided in request', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15'
          // No lastFourSsn in request
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        })

        expect(result.success).toBe(true)
      })
    })

    describe('Combined Validation', () => {
      it('should return all errors combined', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1985-03-20',
          lastFourSsn: '5678'
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('Date of birth')
        expect(result.error).toContain('SSN')
      })

      it('should include verified fields in metadata on success', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15',
          lastFourSsn: '1234'
        })

        expect(result.metadata?.verificationType).toBe('KNOWLEDGE_BASED')
        expect(result.metadata?.verifiedFields).toContain('dateOfBirth')
        expect(result.metadata?.verifiedFields).toContain('lastFourSsn')
        expect(result.metadata?.verifiedAt).toBeDefined()
      })

      it('should only list verified fields that were checked', async () => {
        const request: KbaRequest = {
          mode: 'kba',
          dateOfBirth: '1990-05-15'
        }

        const result = await verifyByKba(request, {
          dateOfBirth: '1990-05-15'
          // No SSN stored
        })

        expect(result.metadata?.verifiedFields).toContain('dateOfBirth')
        expect(result.metadata?.verifiedFields).not.toContain('lastFourSsn')
      })
    })
  })

  describe('submitForManualReview', () => {
    it('should require minimum image data size', async () => {
      const request: ManualRequest = {
        mode: 'manual',
        idImageData: 'short',
        idType: 'DRIVERS_LICENSE'
      }

      const result = await submitForManualReview(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid ID image')
    })

    it('should require idType', async () => {
      const request: ManualRequest = {
        mode: 'manual',
        idImageData: 'a'.repeat(2000),
        idType: '' as any
      }

      const result = await submitForManualReview(request)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ID type')
    })

    it('should return PENDING_REVIEW status on success', async () => {
      const request: ManualRequest = {
        mode: 'manual',
        idImageData: 'data:image/jpeg;base64,' + 'a'.repeat(2000),
        idType: 'DRIVERS_LICENSE'
      }

      const result = await submitForManualReview(request)

      expect(result.success).toBe(true)
      expect(result.method).toBe('manual')
      expect(result.metadata?.status).toBe('PENDING_REVIEW')
    })

    it('should include submission metadata', async () => {
      const request: ManualRequest = {
        mode: 'manual',
        idImageData: 'a'.repeat(5000),
        idType: 'PASSPORT'
      }

      const result = await submitForManualReview(request)

      expect(result.metadata?.verificationType).toBe('MANUAL_REVIEW')
      expect(result.metadata?.idType).toBe('PASSPORT')
      expect(result.metadata?.submittedAt).toBeDefined()
    })

    it('should accept all valid ID types', async () => {
      const idTypes: ManualRequest['idType'][] = ['DRIVERS_LICENSE', 'PASSPORT', 'STATE_ID']

      for (const idType of idTypes) {
        const request: ManualRequest = {
          mode: 'manual',
          idImageData: 'a'.repeat(2000),
          idType
        }

        const result = await submitForManualReview(request)
        expect(result.success).toBe(true)
        expect(result.metadata?.idType).toBe(idType)
      }
    })
  })

  describe('getAttestationText', () => {
    it('should include signer name', () => {
      const text = getAttestationText('John Doe')

      expect(text).toContain('John Doe')
    })

    it('should include perjury warning', () => {
      const text = getAttestationText('Jane Smith')

      expect(text.toLowerCase()).toContain('perjury')
    })

    it('should include identity affirmation', () => {
      const text = getAttestationText('Test User')

      expect(text).toContain('person named')
    })

    it('should include free will statement', () => {
      const text = getAttestationText('Test User')

      expect(text).toContain('free will')
    })

    it('should handle names with special characters', () => {
      const text = getAttestationText("Mary O'Brien-Smith")

      expect(text).toContain("Mary O'Brien-Smith")
    })
  })

  describe('getVerificationRequirements', () => {
    it('should return correct fields for attestation mode', () => {
      const requirements = getVerificationRequirements('attestation')

      expect(requirements.fields).toContain('attestationText')
      expect(requirements.fields).toContain('agreedToTerms')
      expect(requirements.description).toBeTruthy()
    })

    it('should return correct fields for kba mode', () => {
      const requirements = getVerificationRequirements('kba')

      expect(requirements.fields).toContain('dateOfBirth')
      expect(requirements.fields).toContain('lastFourSsn')
      expect(requirements.description).toContain('personal information')
    })

    it('should return correct fields for manual mode', () => {
      const requirements = getVerificationRequirements('manual')

      expect(requirements.fields).toContain('idImageData')
      expect(requirements.fields).toContain('idType')
      expect(requirements.description).toContain('ID')
    })

    it('should return correct fields for persona mode', () => {
      const requirements = getVerificationRequirements('persona')

      expect(requirements.fields).toContain('personaInquiryId')
      expect(requirements.description).toContain('partner')
    })

    it('should handle unknown mode gracefully', () => {
      const requirements = getVerificationRequirements('unknown' as VerificationMode)

      expect(requirements.fields).toEqual([])
      expect(requirements.description).toContain('Unknown')
    })
  })

  describe('getActivityTypeForMode', () => {
    describe('Success cases', () => {
      it('should return IDENTITY_ATTESTED for attestation', () => {
        const activityType = getActivityTypeForMode('attestation', true)

        expect(activityType).toBe('IDENTITY_ATTESTED')
      })

      it('should return IDENTITY_VERIFIED_KBA for kba', () => {
        const activityType = getActivityTypeForMode('kba', true)

        expect(activityType).toBe('IDENTITY_VERIFIED_KBA')
      })

      it('should return IDENTITY_SUBMITTED_FOR_REVIEW for manual', () => {
        const activityType = getActivityTypeForMode('manual', true)

        expect(activityType).toBe('IDENTITY_SUBMITTED_FOR_REVIEW')
      })

      it('should return IDENTITY_VERIFIED_PERSONA for persona', () => {
        const activityType = getActivityTypeForMode('persona', true)

        expect(activityType).toBe('IDENTITY_VERIFIED_PERSONA')
      })

      it('should return IDENTITY_VERIFIED for unknown mode', () => {
        const activityType = getActivityTypeForMode('unknown' as VerificationMode, true)

        expect(activityType).toBe('IDENTITY_VERIFIED')
      })
    })

    describe('Failure cases', () => {
      it('should return IDENTITY_VERIFICATION_FAILED for any failed verification', () => {
        const modes: VerificationMode[] = ['attestation', 'kba', 'manual', 'persona']

        for (const mode of modes) {
          const activityType = getActivityTypeForMode(mode, false)
          expect(activityType).toBe('IDENTITY_VERIFICATION_FAILED')
        }
      })
    })
  })

  describe('Type Guards and Edge Cases', () => {
    it('should handle null/undefined gracefully in attestation', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: null as any,
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'Test')

      expect(result.success).toBe(false)
    })

    it('should handle whitespace-only attestation text', async () => {
      const request: AttestationRequest = {
        mode: 'attestation',
        attestationText: '          ',
        agreedToTerms: true
      }

      const result = await verifyByAttestation(request, 'Test')

      // 10 spaces meets minimum length but semantically empty
      // Current implementation would pass this - document the behavior
      expect(result.success).toBe(true) // This tests current behavior
    })

    it('should handle date edge cases in KBA', async () => {
      // Leap year date
      const request: KbaRequest = {
        mode: 'kba',
        dateOfBirth: '2000-02-29'
      }

      const result = await verifyByKba(request, { dateOfBirth: '2000-02-29' })

      expect(result.success).toBe(true)
    })
  })
})
