/**
 * LawPay OAuth2 Authorization Endpoint
 * Step 1: Redirect user to LawPay authorization page
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { lawPayClientId, lawPayRedirectUri } = config

  if (!lawPayClientId || !lawPayRedirectUri) {
    throw createError({
      statusCode: 500,
      message: 'LawPay OAuth2 not configured'
    })
  }

  // Generate a random state parameter for CSRF protection
  const state = crypto.randomUUID()

  // Store state in session for verification on callback
  const session = await getUserSession(event)
  await setUserSession(event, {
    ...session,
    lawpay_oauth_state: state
  })

  // Generate authorization URL
  const authUrl = getLawPayAuthorizationUrl(
    lawPayClientId,
    lawPayRedirectUri,
    state,
    'payments'
  )

  // Redirect to LawPay
  return sendRedirect(event, authUrl)
})
