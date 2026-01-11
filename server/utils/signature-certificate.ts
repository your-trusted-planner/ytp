/**
 * Signature Certificate Utilities
 *
 * Provides tamper-evident signature certificates for the e-signature system.
 * Uses SHA-256 hashing for document and signature integrity verification.
 *
 * IMPORTANT: These certificates create an audit trail for legal validity.
 * Do not modify the certificate structure without understanding legal implications.
 */

import { generateId } from './auth'

/**
 * Signature Certificate - Tamper-evident record of a signing ceremony
 */
export interface SignatureCertificate {
  version: '1.0'
  certificateId: string
  documentId: string
  documentHash: string // SHA-256 of document content at signing time
  signatureSessionId: string

  signer: {
    userId: string
    email: string
    name: string
    ipAddress: string | null
    userAgent: string | null
    geolocation: {
      country: string | null
      region: string | null
      city: string | null
    } | null
  }

  verification: {
    tier: 'STANDARD' | 'ENHANCED'
    method: string | null // 'KYC', 'SMS_OTP', 'EMAIL_OTP', 'KNOWLEDGE_BASED'
    verifiedAt: string | null
    providerId: string | null
  }

  signature: {
    capturedAt: string
    dataHash: string // SHA-256 of signature PNG data
  }

  terms: {
    acceptedAt: string
    version: string
  }

  timestamps: {
    sessionCreated: string
    documentViewed: string | null
    identityVerified: string | null
    signed: string
    certificateGenerated: string
  }

  // Self-referential hash for tamper detection
  certificateHash: string
}

/**
 * Input data for generating a signature certificate
 */
export interface CertificateInput {
  documentId: string
  documentContent: string // Raw document content to hash
  signatureSessionId: string
  signer: {
    userId: string
    email: string
    name: string
    ipAddress: string | null
    userAgent: string | null
    country: string | null
    region: string | null
    city: string | null
  }
  verification: {
    tier: 'STANDARD' | 'ENHANCED'
    method: string | null
    verifiedAt: Date | null
    providerId: string | null
  }
  signatureData: string // Base64 PNG
  termsVersion: string
  timestamps: {
    sessionCreated: Date
    documentViewed: Date | null
    identityVerified: Date | null
    termsAccepted: Date
  }
}

/**
 * Generates a cryptographically secure random token for signing URLs.
 * Uses Web Crypto API (available in Cloudflare Workers).
 */
export function generateSigningToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Computes SHA-256 hash of a string.
 * Uses Web Crypto API for Cloudflare Workers compatibility.
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a tamper-evident signature certificate.
 *
 * The certificate includes:
 * - Document hash at time of signing (proves document wasn't modified after)
 * - Signature data hash (proves signature wasn't swapped)
 * - Certificate hash (proves certificate wasn't modified)
 * - Full audit trail with timestamps and IP/geolocation
 */
export async function generateSignatureCertificate(
  input: CertificateInput
): Promise<SignatureCertificate> {
  const now = new Date()
  const certificateId = generateId()

  // Hash the document content
  const documentHash = await sha256(input.documentContent)

  // Hash the signature data
  const signatureDataHash = await sha256(input.signatureData)

  // Build certificate without final hash
  const certificateData: Omit<SignatureCertificate, 'certificateHash'> = {
    version: '1.0',
    certificateId,
    documentId: input.documentId,
    documentHash,
    signatureSessionId: input.signatureSessionId,
    signer: {
      userId: input.signer.userId,
      email: input.signer.email,
      name: input.signer.name,
      ipAddress: input.signer.ipAddress,
      userAgent: input.signer.userAgent,
      geolocation: (input.signer.country || input.signer.region || input.signer.city)
        ? {
            country: input.signer.country,
            region: input.signer.region,
            city: input.signer.city
          }
        : null
    },
    verification: {
      tier: input.verification.tier,
      method: input.verification.method,
      verifiedAt: input.verification.verifiedAt?.toISOString() ?? null,
      providerId: input.verification.providerId
    },
    signature: {
      capturedAt: now.toISOString(),
      dataHash: signatureDataHash
    },
    terms: {
      acceptedAt: input.timestamps.termsAccepted.toISOString(),
      version: input.termsVersion
    },
    timestamps: {
      sessionCreated: input.timestamps.sessionCreated.toISOString(),
      documentViewed: input.timestamps.documentViewed?.toISOString() ?? null,
      identityVerified: input.timestamps.identityVerified?.toISOString() ?? null,
      signed: now.toISOString(),
      certificateGenerated: now.toISOString()
    }
  }

  // Compute final certificate hash (hash of all certificate data)
  const certificateHash = await sha256(JSON.stringify(certificateData))

  return {
    ...certificateData,
    certificateHash
  }
}

/**
 * Verifies a signature certificate's integrity.
 * Returns true if the certificate hasn't been tampered with.
 */
export async function verifyCertificateIntegrity(
  certificate: SignatureCertificate
): Promise<boolean> {
  // Extract certificate hash and recompute
  const { certificateHash, ...certificateData } = certificate
  const computedHash = await sha256(JSON.stringify(certificateData))
  return computedHash === certificateHash
}

/**
 * Calculates token expiration time.
 * @param expiresIn - Duration string ('24h', '48h', '7d') or milliseconds
 */
export function calculateTokenExpiration(expiresIn: string | number): Date {
  const now = Date.now()

  if (typeof expiresIn === 'number') {
    return new Date(now + expiresIn)
  }

  const match = expiresIn.match(/^(\d+)(h|d|m)$/)
  if (!match) {
    // Default to 48 hours
    return new Date(now + 48 * 60 * 60 * 1000)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'm':
      return new Date(now + value * 60 * 1000)
    case 'h':
      return new Date(now + value * 60 * 60 * 1000)
    case 'd':
      return new Date(now + value * 24 * 60 * 60 * 1000)
    default:
      return new Date(now + 48 * 60 * 60 * 1000)
  }
}

/**
 * Checks if a signing token has expired.
 */
export function isTokenExpired(expiresAt: Date | number): boolean {
  const expiry = typeof expiresAt === 'number' ? expiresAt : expiresAt.getTime()
  return Date.now() > expiry
}

/**
 * Default token expiration (48 hours in milliseconds)
 */
export const DEFAULT_TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000

/**
 * Default terms version for signature acceptance
 */
export const CURRENT_TERMS_VERSION = '2024.1'
