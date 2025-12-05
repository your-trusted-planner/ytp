/**
 * Google Calendar API Integration (Service Account)
 * Uses JWT-based service account authentication
 * Documentation: https://developers.google.com/identity/protocols/oauth2/service-account
 */

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  location?: string
}

/**
 * Create a JWT for Google Service Account authentication
 * Uses Web Crypto API (compatible with Cloudflare Workers)
 *
 * @param serviceAccountEmail - Service account email
 * @param privateKey - Service account private key
 * @param impersonateEmail - Email of user to impersonate (for domain-wide delegation)
 */
async function createJWT(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  // JWT claims (with optional impersonation)
  const claims: any = {
    iss: serviceAccountEmail,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URI,
    exp: expiry,
    iat: now
  }

  // Add 'sub' claim for domain-wide delegation (impersonation)
  if (impersonateEmail) {
    claims.sub = impersonateEmail
  }

  // Base64url encode
  const base64url = (data: object): string => {
    return btoa(JSON.stringify(data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  const headerEncoded = base64url(header)
  const claimsEncoded = base64url(claims)
  const signatureInput = `${headerEncoded}.${claimsEncoded}`

  // Import private key
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
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )

  // Sign the JWT
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

/**
 * Get access token using service account JWT
 *
 * @param serviceAccountEmail - Service account email
 * @param privateKey - Service account private key
 * @param impersonateEmail - Email of user to impersonate (for domain-wide delegation)
 */
async function getAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string
): Promise<string> {
  const jwt = await createJWT(serviceAccountEmail, privateKey, impersonateEmail)

  const response = await fetch(GOOGLE_TOKEN_URI, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Get service account credentials from config
 */
function getServiceAccountConfig() {
  const config = useRuntimeConfig()
  const { googleServiceAccountEmail, googleServiceAccountPrivateKey } = config

  if (!googleServiceAccountEmail || !googleServiceAccountPrivateKey) {
    throw new Error('Google Calendar service account not configured')
  }

  return {
    email: googleServiceAccountEmail,
    privateKey: googleServiceAccountPrivateKey
  }
}

/**
 * List events from an attorney's calendar
 *
 * @param attorneyEmail - Email of the attorney whose calendar to check
 * @param timeMin - Start time (ISO 8601)
 * @param timeMax - End time (ISO 8601)
 * @param maxResults - Maximum number of events to return
 */
export async function listCalendarEvents(
  attorneyEmail: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50
): Promise<CalendarEvent[]> {
  const { email, privateKey } = getServiceAccountConfig()
  const accessToken = await getAccessToken(email, privateKey, attorneyEmail)
  const calendarId = 'primary' // Use attorney's primary calendar

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime'
  })

  if (timeMin) params.append('timeMin', timeMin)
  if (timeMax) params.append('timeMax', timeMax)

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list events: ${error}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Create a new calendar event on an attorney's calendar
 *
 * @param attorneyEmail - Email of the attorney whose calendar to use
 * @param event - Event details to create
 */
export async function createCalendarEvent(
  attorneyEmail: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const { email, privateKey } = getServiceAccountConfig()
  const accessToken = await getAccessToken(email, privateKey, attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create event: ${error}`)
  }

  return response.json()
}

/**
 * Update an existing calendar event on an attorney's calendar
 *
 * @param attorneyEmail - Email of the attorney whose calendar to use
 * @param eventId - ID of the event to update
 * @param event - Updated event details
 */
export async function updateCalendarEvent(
  attorneyEmail: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { email, privateKey } = getServiceAccountConfig()
  const accessToken = await getAccessToken(email, privateKey, attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update event: ${error}`)
  }

  return response.json()
}

/**
 * Delete a calendar event from an attorney's calendar
 *
 * @param attorneyEmail - Email of the attorney whose calendar to use
 * @param eventId - ID of the event to delete
 */
export async function deleteCalendarEvent(
  attorneyEmail: string,
  eventId: string
): Promise<void> {
  const { email, privateKey } = getServiceAccountConfig()
  const accessToken = await getAccessToken(email, privateKey, attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete event: ${error}`)
  }
}

/**
 * Get free/busy information to check attorney availability
 *
 * @param attorneyEmail - Email of the attorney to check
 * @param timeMin - Start time (ISO 8601)
 * @param timeMax - End time (ISO 8601)
 */
export async function getFreeBusy(
  attorneyEmail: string,
  timeMin: string,
  timeMax: string
): Promise<any> {
  const { email, privateKey } = getServiceAccountConfig()
  const accessToken = await getAccessToken(email, privateKey, attorneyEmail)
  const calendarId = attorneyEmail

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/freeBusy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }]
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get free/busy: ${error}`)
  }

  return response.json()
}
