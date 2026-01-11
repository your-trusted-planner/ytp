/**
 * Identity Verification Utility
 *
 * Supports multiple verification modes for Enhanced signature tier:
 * - attestation: Self-attestation with legal acknowledgment (PoC/simple)
 * - kba: Knowledge-based authentication (DOB, last 4 SSN)
 * - manual: Photo ID upload with attorney review
 * - persona: Persona.com KYC integration (future)
 *
 * All modes create audit trail via activity logging.
 */

export type VerificationMode = 'attestation' | 'kba' | 'manual' | 'persona'

export interface VerificationResult {
  success: boolean
  method: VerificationMode
  error?: string
  metadata?: Record<string, any>
}

export interface AttestationRequest {
  mode: 'attestation'
  attestationText: string
  agreedToTerms: boolean
}

export interface KbaRequest {
  mode: 'kba'
  dateOfBirth: string // YYYY-MM-DD
  lastFourSsn?: string // Optional, only if we have it on file
}

export interface ManualRequest {
  mode: 'manual'
  idImageData: string // Base64 image
  idType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'STATE_ID'
}

export type VerificationRequest = AttestationRequest | KbaRequest | ManualRequest

/**
 * Get the current verification mode from config
 */
export function getVerificationMode(): VerificationMode {
  const config = useRuntimeConfig()
  const mode = config.identityVerificationMode as string || 'attestation'

  if (!['attestation', 'kba', 'manual', 'persona'].includes(mode)) {
    console.warn(`[Identity] Invalid verification mode "${mode}", defaulting to attestation`)
    return 'attestation'
  }

  return mode as VerificationMode
}

/**
 * Verify identity via self-attestation
 * User acknowledges their identity under penalty of perjury
 */
export async function verifyByAttestation(
  request: AttestationRequest,
  signerName: string
): Promise<VerificationResult> {
  // Validate attestation
  if (!request.agreedToTerms) {
    return {
      success: false,
      method: 'attestation',
      error: 'You must agree to the attestation terms'
    }
  }

  if (!request.attestationText || request.attestationText.length < 10) {
    return {
      success: false,
      method: 'attestation',
      error: 'Invalid attestation text'
    }
  }

  // Attestation is valid - user has affirmed their identity
  return {
    success: true,
    method: 'attestation',
    metadata: {
      attestationType: 'SELF_ATTESTATION',
      attestationText: request.attestationText,
      attestedAt: new Date().toISOString(),
      signerName
    }
  }
}

/**
 * Verify identity via Knowledge-Based Authentication
 * Checks DOB and optionally last 4 SSN against stored data
 */
export async function verifyByKba(
  request: KbaRequest,
  storedData: { dateOfBirth?: string; lastFourSsn?: string }
): Promise<VerificationResult> {
  const errors: string[] = []

  // Validate date of birth
  if (!request.dateOfBirth) {
    errors.push('Date of birth is required')
  } else if (storedData.dateOfBirth) {
    // Normalize dates for comparison (handle timezone issues)
    const providedDate = request.dateOfBirth.split('T')[0]
    const storedDate = storedData.dateOfBirth.split('T')[0]

    if (providedDate !== storedDate) {
      errors.push('Date of birth does not match our records')
    }
  }

  // Validate last 4 SSN if we have it on file
  if (storedData.lastFourSsn && request.lastFourSsn) {
    const providedSsn = request.lastFourSsn.replace(/\D/g, '')
    const storedSsn = storedData.lastFourSsn.replace(/\D/g, '')

    if (providedSsn !== storedSsn) {
      errors.push('Last 4 digits of SSN do not match our records')
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      method: 'kba',
      error: errors.join('. ')
    }
  }

  return {
    success: true,
    method: 'kba',
    metadata: {
      verificationType: 'KNOWLEDGE_BASED',
      verifiedFields: [
        'dateOfBirth',
        ...(storedData.lastFourSsn ? ['lastFourSsn'] : [])
      ],
      verifiedAt: new Date().toISOString()
    }
  }
}

/**
 * Submit ID for manual review
 * Returns pending status - attorney must approve
 */
export async function submitForManualReview(
  request: ManualRequest
): Promise<VerificationResult> {
  if (!request.idImageData || request.idImageData.length < 1000) {
    return {
      success: false,
      method: 'manual',
      error: 'Invalid ID image'
    }
  }

  if (!request.idType) {
    return {
      success: false,
      method: 'manual',
      error: 'ID type is required'
    }
  }

  // Manual review returns success but identity is not yet verified
  // Attorney must approve via separate endpoint
  return {
    success: true,
    method: 'manual',
    metadata: {
      verificationType: 'MANUAL_REVIEW',
      idType: request.idType,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString()
    }
  }
}

/**
 * Get attestation text template
 */
export function getAttestationText(signerName: string): string {
  return `I, ${signerName}, hereby attest under penalty of perjury under the laws of the United States of America that I am the person named in this document, that I am signing this document of my own free will, and that the information I have provided is true and correct to the best of my knowledge.`
}

/**
 * Get verification requirements for a mode
 */
export function getVerificationRequirements(mode: VerificationMode): {
  fields: string[]
  description: string
} {
  switch (mode) {
    case 'attestation':
      return {
        fields: ['attestationText', 'agreedToTerms'],
        description: 'Confirm your identity by agreeing to a legal attestation statement'
      }
    case 'kba':
      return {
        fields: ['dateOfBirth', 'lastFourSsn'],
        description: 'Verify your identity by confirming personal information on file'
      }
    case 'manual':
      return {
        fields: ['idImageData', 'idType'],
        description: 'Upload a photo of your government-issued ID for review'
      }
    case 'persona':
      return {
        fields: ['personaInquiryId'],
        description: 'Complete identity verification through our secure partner'
      }
    default:
      return {
        fields: [],
        description: 'Unknown verification mode'
      }
  }
}

/**
 * Map verification mode to activity type
 */
export function getActivityTypeForMode(mode: VerificationMode, success: boolean): string {
  if (!success) {
    return 'IDENTITY_VERIFICATION_FAILED'
  }

  switch (mode) {
    case 'attestation':
      return 'IDENTITY_ATTESTED'
    case 'kba':
      return 'IDENTITY_VERIFIED_KBA'
    case 'manual':
      return 'IDENTITY_SUBMITTED_FOR_REVIEW'
    case 'persona':
      return 'IDENTITY_VERIFIED_PERSONA'
    default:
      return 'IDENTITY_VERIFIED'
  }
}
