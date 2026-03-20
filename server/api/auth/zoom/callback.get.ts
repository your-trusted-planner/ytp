/**
 * Zoom OAuth2 Callback Endpoint
 * Step 2: Handle redirect from Zoom with authorization code
 *
 * Zoom app credentials are stored encrypted in the database,
 * not in environment variables.
 */

import { getZoomConfig, storeZoomConnection } from '../../../utils/zoom-tokens'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Extract parameters
  const code = query.code as string
  const state = query.state as string
  const error = query.error as string

  // Handle errors from Zoom — redirect back with error
  if (error) {
    console.error('Zoom authorization denied:', error)
    return sendRedirect(event, `/profile?zoom=error&reason=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return sendRedirect(event, '/profile?zoom=error&reason=missing_code')
  }

  // Verify state parameter (CSRF protection)
  const session = await getUserSession(event)
  if (session.zoom_oauth_state !== state) {
    return sendRedirect(event, '/profile?zoom=error&reason=invalid_state')
  }

  const user = session.user
  if (!user?.id) {
    return sendRedirect(event, '/profile?zoom=error&reason=no_session')
  }

  try {
    // Get Zoom app credentials from encrypted integrations store
    const { clientId, clientSecret, redirectUri } = await getZoomConfig(event)

    // Exchange authorization code for access token
    const basicAuth = btoa(`${clientId}:${clientSecret}`)

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Zoom token exchange failed:', tokenResponse.status, errorText)
      return sendRedirect(event, `/profile?zoom=error&reason=${encodeURIComponent('Token exchange failed: ' + tokenResponse.status)}`)
    }

    const tokenData = await tokenResponse.json()

    // Get Zoom user info — try /v2/users/me first, fall back to token data
    let providerAccountId = ''
    let providerEmail = ''

    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (userResponse.ok) {
      const zoomUser = await userResponse.json()
      providerAccountId = zoomUser.id || ''
      providerEmail = zoomUser.email || ''
    } else {
      // user:read scope may not be granted — extract what we can from token response
      const errorText = await userResponse.text()
      console.warn('Zoom /v2/users/me failed (scope may be missing):', userResponse.status, errorText)

      // The token response itself doesn't include user info, but we can proceed
      // with empty values — the connection still works for creating meetings
      providerEmail = user.email || ''
      providerAccountId = 'unknown'
    }

    // Store connection using hybrid DB + KV approach
    await storeZoomConnection(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in || 3600,
      providerAccountId,
      providerEmail,
      tokenData.scope || ''
    )

    // Redirect to profile with success indicator
    return sendRedirect(event, '/profile?zoom=connected')

  } catch (err: any) {
    console.error('Zoom OAuth error:', err.message)
    return sendRedirect(event, `/profile?zoom=error&reason=${encodeURIComponent(err.message)}`)
  }
})
