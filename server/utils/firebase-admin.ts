/**
 * Firebase ID Token Verification for Cloudflare Workers
 *
 * The firebase-admin SDK is not compatible with Cloudflare Workers because it uses
 * Node.js-specific APIs. This module verifies Firebase ID tokens using the Web Crypto API.
 */

// Google's public keys endpoint for Firebase Auth
const GOOGLE_KEYS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

// Cache for Google's public keys
let cachedKeys: { keys: Record<string, string>; expiresAt: number } | null = null

export interface DecodedIdToken {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  iss: string
  aud: string
  auth_time: number
  sub: string
  iat: number
  exp: number
  firebase: {
    identities: Record<string, string[]>
    sign_in_provider: string
  }
  [key: string]: any
}

/**
 * Fetch Google's public keys for verifying Firebase tokens
 */
async function getGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now()

  // Return cached keys if still valid
  if (cachedKeys && cachedKeys.expiresAt > now) {
    return cachedKeys.keys
  }

  const response = await fetch(GOOGLE_KEYS_URL)

  if (!response.ok) {
    throw new Error(`Failed to fetch Google public keys: ${response.status}`)
  }

  const keys = await response.json() as Record<string, string>

  // Parse cache-control header for expiration
  const cacheControl = response.headers.get('cache-control')
  let maxAge = 3600 // Default 1 hour

  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/)
    if (match) {
      maxAge = parseInt(match[1], 10)
    }
  }

  cachedKeys = {
    keys,
    expiresAt: now + (maxAge * 1000)
  }

  return keys
}

/**
 * Convert a PEM certificate to a CryptoKey
 */
async function pemToCryptoKey(pem: string): Promise<CryptoKey> {
  // Extract the base64 content from PEM
  const pemContents = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '')

  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  // Import as X.509 certificate and extract public key
  // Note: Workers supports importing certificates directly
  return await crypto.subtle.importKey(
    'spki',
    extractPublicKeyFromCert(binaryDer),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  )
}

/**
 * Extract the public key from an X.509 certificate
 * This is a simplified parser for Google's certificates
 */
function extractPublicKeyFromCert(cert: Uint8Array): ArrayBuffer {
  // Find the SubjectPublicKeyInfo in the certificate
  // Google's certificates use RSA with a predictable structure
  // We look for the OID for RSA encryption (1.2.840.113549.1.1.1) followed by the key

  // Convert to hex for easier parsing
  const hex = Array.from(cert).map(b => b.toString(16).padStart(2, '0')).join('')

  // Look for the RSA OID: 06 09 2a 86 48 86 f7 0d 01 01 01 (followed by 05 00 for NULL params)
  const rsaOidHex = '06092a864886f70d010101'
  const rsaOidIndex = hex.indexOf(rsaOidHex)

  if (rsaOidIndex === -1) {
    throw new Error('Could not find RSA OID in certificate')
  }

  // The SubjectPublicKeyInfo starts with a SEQUENCE tag (30) before the AlgorithmIdentifier
  // We need to find the SEQUENCE that contains both the AlgorithmIdentifier and the BIT STRING

  // Search backwards from the OID to find the SEQUENCE tag for SubjectPublicKeyInfo
  let searchIndex = rsaOidIndex - 2 // Start before the SEQUENCE for AlgorithmIdentifier

  // Find the SEQUENCE that wraps SubjectPublicKeyInfo (contains AlgorithmIdentifier + BIT STRING)
  while (searchIndex > 0) {
    searchIndex -= 2
    const tag = hex.substring(searchIndex, searchIndex + 2)
    if (tag === '30') {
      // Check if this SEQUENCE contains our OID
      const lengthByte = parseInt(hex.substring(searchIndex + 2, searchIndex + 4), 16)

      let contentStart: number
      let contentLength: number

      if (lengthByte < 128) {
        contentStart = searchIndex + 4
        contentLength = lengthByte * 2
      } else if (lengthByte === 0x81) {
        contentLength = parseInt(hex.substring(searchIndex + 4, searchIndex + 6), 16) * 2
        contentStart = searchIndex + 6
      } else if (lengthByte === 0x82) {
        contentLength = parseInt(hex.substring(searchIndex + 4, searchIndex + 8), 16) * 2
        contentStart = searchIndex + 8
      } else {
        continue
      }

      const sequenceContent = hex.substring(contentStart, contentStart + contentLength)

      // If this SEQUENCE contains the RSA OID and a BIT STRING (03), it's the SubjectPublicKeyInfo
      if (sequenceContent.includes(rsaOidHex) && sequenceContent.includes('03')) {
        const spkiHex = hex.substring(searchIndex, contentStart + contentLength)
        const spkiBytes = new Uint8Array(spkiHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)))
        return spkiBytes.buffer
      }
    }
  }

  throw new Error('Could not extract SubjectPublicKeyInfo from certificate')
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding
  const binary = atob(base64)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

/**
 * Verify a Firebase ID token
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken | null> {
  try {
    // Split the JWT
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      console.error('[Firebase] Invalid token format')
      return null
    }

    const [headerB64, payloadB64, signatureB64] = parts

    // Decode header to get the key ID
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)))
    const kid = header.kid
    const alg = header.alg

    if (alg !== 'RS256') {
      console.error('[Firebase] Unsupported algorithm:', alg)
      return null
    }

    // Get the public key
    const publicKeys = await getGooglePublicKeys()
    const publicKeyPem = publicKeys[kid]

    if (!publicKeyPem) {
      console.error('[Firebase] Unknown key ID:', kid)
      return null
    }

    // Convert PEM to CryptoKey
    const cryptoKey = await pemToCryptoKey(publicKeyPem)

    // Verify signature
    const signedContent = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(signatureB64)

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      signedContent
    )

    if (!isValid) {
      console.error('[Firebase] Invalid signature')
      return null
    }

    // Decode and validate payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as DecodedIdToken

    // Get project ID from runtime config
    const config = useRuntimeConfig()
    const projectId = config.public?.firebaseProjectId || config.firebaseProjectId

    // Validate claims
    const now = Math.floor(Date.now() / 1000)

    // Check expiration
    if (payload.exp < now) {
      console.error('[Firebase] Token expired')
      return null
    }

    // Check issued at (not in the future, with 5 min tolerance for clock skew)
    if (payload.iat > now + 300) {
      console.error('[Firebase] Token issued in the future')
      return null
    }

    // Check issuer
    const expectedIssuer = `https://securetoken.google.com/${projectId}`
    if (payload.iss !== expectedIssuer) {
      console.error('[Firebase] Invalid issuer:', payload.iss, 'expected:', expectedIssuer)
      return null
    }

    // Check audience
    if (payload.aud !== projectId) {
      console.error('[Firebase] Invalid audience:', payload.aud)
      return null
    }

    // Check subject (uid)
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.error('[Firebase] Invalid subject')
      return null
    }

    // Add uid alias for compatibility
    payload.uid = payload.sub

    return payload
  } catch (error) {
    console.error('[Firebase] Token verification error:', error)
    return null
  }
}
