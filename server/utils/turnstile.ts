/**
 * Cloudflare Turnstile server-side verification.
 *
 * Call verifyTurnstileToken() in any public endpoint before processing.
 * Requires TURNSTILE_SECRET_KEY in runtime config / environment.
 *
 * In development, if TURNSTILE_SECRET_KEY is not set, verification is skipped
 * with a warning. In production, missing secret key throws an error.
 */

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 * Throws createError(400) if verification fails.
 * Skips verification in development if secret key is not configured.
 */
export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string): Promise<void> {
  const config = useRuntimeConfig()
  const secretKey = config.turnstileSecretKey || process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    if (process.dev) {
      console.warn('[Turnstile] No secret key configured — skipping verification in development')
      return
    }
    throw createError({ statusCode: 500, message: 'Turnstile not configured' })
  }

  if (!token) {
    throw createError({ statusCode: 400, message: 'Please complete the security check' })
  }

  const body: Record<string, string> = {
    secret: secretKey,
    response: token
  }
  if (remoteIp) body.remoteip = remoteIp

  const result = await $fetch<TurnstileVerifyResponse>('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body
  })

  if (!result.success) {
    console.warn('[Turnstile] Verification failed:', result['error-codes'])
    throw createError({
      statusCode: 400,
      message: 'Security verification failed. Please try again.'
    })
  }
}
