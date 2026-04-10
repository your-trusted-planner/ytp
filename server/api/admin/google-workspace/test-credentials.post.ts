/**
 * POST /api/admin/google-workspace/test-credentials
 * Test that service account credentials can authenticate with Google.
 * Does NOT require a Drive ID — just verifies the JWT grant works.
 */

import { z } from 'zod'

const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/calendar'

const testSchema = z.object({
  serviceAccountEmail: z.string().email().optional(),
  serviceAccountPrivateKey: z.string().optional(),
  /** If provided, also tests domain-wide delegation by impersonating this user */
  impersonateEmail: z.string().email().optional()
})

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/*
  const body = await readBody(event).catch(() => ({}))
  const parsed = testSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  let email = parsed.data.serviceAccountEmail
  let privateKey = parsed.data.serviceAccountPrivateKey

  // If not provided in body, try DB config
  if (!email || !privateKey) {
    try {
      const { useDrizzle, schema } = await import('../../../db')
      const db = useDrizzle()
      const [config] = await db
        .select({
          email: schema.googleDriveConfig.serviceAccountEmail,
          privateKey: schema.googleDriveConfig.serviceAccountPrivateKey
        })
        .from(schema.googleDriveConfig)
        .all()

      if (config?.email && config?.privateKey) {
        email = email || config.email
        privateKey = privateKey || config.privateKey
      }
    }
    catch {}
  }

  // Last resort: env vars
  if (!email || !privateKey) {
    const runtimeConfig = useRuntimeConfig()
    email = email || (runtimeConfig.googleServiceAccountEmail as string)
    privateKey = privateKey || (runtimeConfig.googleServiceAccountPrivateKey as string)
  }

  if (!email || !privateKey) {
    return { success: false, error: 'No credentials provided or stored.' }
  }

  // Step 1: Test basic service account auth (no impersonation)
  try {
    const jwt = await createTestJWT(email, privateKey)

    const response = await fetch(GOOGLE_TOKEN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Authentication failed'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error_description || errorData.error || errorMessage
      }
      catch {}
      return { success: false, error: `Service account auth failed: ${errorMessage}` }
    }
  }
  catch (err: any) {
    return { success: false, error: err.message || 'Failed to authenticate service account' }
  }

  // Step 2: If impersonateEmail provided, test domain-wide delegation
  const impersonateEmail = parsed.data.impersonateEmail
  if (impersonateEmail) {
    try {
      const jwt = await createTestJWT(email, privateKey, impersonateEmail)

      const response = await fetch(GOOGLE_TOKEN_URI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Impersonation failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error_description || errorData.error || errorMessage
        }
        catch {}
        return {
          success: false,
          serviceAccountOk: true,
          error: `Service account authenticated, but domain-wide delegation failed for ${impersonateEmail}: ${errorMessage}. Check Google Workspace Admin > Security > API controls > Domain-wide delegation.`
        }
      }

      return { success: true, email, impersonateEmail, delegationVerified: true }
    }
    catch (err: any) {
      return { success: false, serviceAccountOk: true, error: `Delegation test failed: ${err.message}` }
    }
  }

  return { success: true, email, delegationVerified: false }
})

/**
 * JWT creation for testing — optionally with impersonation (sub claim).
 */
async function createTestJWT(serviceAccountEmail: string, privateKey: string, impersonateEmail?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims: Record<string, any> = {
    iss: serviceAccountEmail,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URI,
    exp: now + 300,
    iat: now
  }

  if (impersonateEmail) {
    claims.sub = impersonateEmail
  }

  const base64url = (data: object): string =>
    btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const headerEncoded = base64url(header)
  const claimsEncoded = base64url(claims)
  const signatureInput = `${headerEncoded}.${claimsEncoded}`

  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '\n')
    .replace(/\n/g, '')
    .trim()

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  )

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return `${signatureInput}.${signatureEncoded}`
}
