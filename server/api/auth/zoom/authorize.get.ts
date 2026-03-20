/**
 * Zoom OAuth2 Authorization Endpoint
 * Step 1: Redirect user to Zoom authorization page
 *
 * Zoom app credentials are stored encrypted in the database,
 * not in environment variables.
 */

import { getZoomConfig } from '../../../utils/zoom-tokens'

export default defineEventHandler(async (event) => {
  // Require authenticated user (LAWYER, ADMIN, STAFF)
  requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  // Get Zoom credentials from encrypted integrations store
  const { clientId, redirectUri } = await getZoomConfig(event)

  if (!redirectUri) {
    throw createError({
      statusCode: 500,
      message: 'Zoom redirect URI not configured. Go to Settings > Video Providers to complete setup.'
    })
  }

  // Generate a random state parameter for CSRF protection
  const state = crypto.randomUUID()

  // Store state in session for verification on callback
  const session = await getUserSession(event)
  await setUserSession(event, {
    ...session,
    zoom_oauth_state: state
  })

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state
  })

  const authUrl = `https://zoom.us/oauth/authorize?${params}`

  // Redirect to Zoom
  return sendRedirect(event, authUrl)
})
