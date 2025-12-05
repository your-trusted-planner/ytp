/**
 * LawPay OAuth2 Callback Endpoint
 * Step 2: Handle redirect from LawPay with authorization code
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { lawPayClientId, lawPayClientSecret, lawPayRedirectUri } = config
  const query = getQuery(event)

  // Extract parameters
  const code = query.code as string
  const state = query.state as string
  const error = query.error as string

  // Handle errors from LawPay
  if (error) {
    throw createError({
      statusCode: 400,
      message: `LawPay authorization failed: ${error}`
    })
  }

  if (!code || !state) {
    throw createError({
      statusCode: 400,
      message: 'Missing authorization code or state'
    })
  }

  // Verify state parameter (CSRF protection)
  const session = await getUserSession(event)
  if (session.lawpay_oauth_state !== state) {
    throw createError({
      statusCode: 400,
      message: 'Invalid state parameter'
    })
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      code,
      lawPayClientId,
      lawPayClientSecret,
      lawPayRedirectUri
    )

    // Get gateway credentials
    const credentials = await getGatewayCredentials(tokenResponse.access_token)

    // Store connection using hybrid DB + KV approach
    const { user } = session

    await storeLawPayConnection(
      user.id,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      tokenResponse.expires_in,
      credentials.merchant_public_key,
      tokenResponse.scope
    )

    // Redirect to success page
    return sendRedirect(event, '/dashboard?lawpay=connected')

  } catch (error: any) {
    console.error('LawPay OAuth error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to complete LawPay authorization: ${error.message}`
    })
  }
})
