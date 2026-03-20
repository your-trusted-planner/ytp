/**
 * Google Calendar API Integration (Service Account)
 * Uses JWT-based service account authentication with KV token caching
 * Documentation: https://developers.google.com/identity/protocols/oauth2/service-account
 */

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
// Full calendar scope needed for calendar list + freeBusy + event management
const SCOPE = 'https://www.googleapis.com/auth/calendar'

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  location?: string
  status?: string
  htmlLink?: string
  iCalUID?: string
}

export interface FreeBusyPeriod {
  start: string
  end: string
}

export interface CalendarListEntry {
  id: string
  summary: string
  description?: string
  timeZone?: string
  primary?: boolean
  accessRole?: string
}

/**
 * Create a JWT for Google Service Account authentication
 * Uses Web Crypto API (compatible with Cloudflare Workers)
 */
async function createJWT(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const claims: any = {
    iss: serviceAccountEmail,
    scope: SCOPE,
    aud: GOOGLE_TOKEN_URI,
    exp: expiry,
    iat: now
  }

  if (impersonateEmail) {
    claims.sub = impersonateEmail
  }

  const base64url = (data: object): string => {
    return btoa(JSON.stringify(data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

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
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
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

/**
 * Get access token using service account JWT (no caching)
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
 * Get cached access token — checks KV first, falls back to fresh token.
 * Caches for 55 minutes (tokens expire after 60 min).
 */
async function getCachedAccessToken(impersonateEmail: string): Promise<string> {
  const { email, privateKey } = await getServiceAccountConfig()
  const kvKey = `gcal:token:${impersonateEmail}`

  try {
    const { kv } = await import('@nuxthub/kv')
    const cached = await kv.get(kvKey)
    if (cached && typeof cached === 'string') {
      return cached
    }
  } catch {
    // KV not available, fall through to fresh token
  }

  const token = await getAccessToken(email, privateKey, impersonateEmail)

  try {
    const { kv } = await import('@nuxthub/kv')
    await kv.set(kvKey, token, { ttl: 3300 }) // 55 min
  } catch {
    // KV not available, token still works
  }

  return token
}

/**
 * Get service account credentials.
 * Checks DB config (shared with Drive) first, falls back to runtime env vars.
 */
async function getServiceAccountConfig(): Promise<{ email: string; privateKey: string }> {
  // Try DB config first (shared googleDriveConfig table)
  try {
    const { useDrizzle, schema } = await import('../db')
    const db = useDrizzle()
    const [config] = await db
      .select({
        email: schema.googleDriveConfig.serviceAccountEmail,
        privateKey: schema.googleDriveConfig.serviceAccountPrivateKey
      })
      .from(schema.googleDriveConfig)
      .all()

    if (config?.email && config?.privateKey) {
      return { email: config.email, privateKey: config.privateKey }
    }
  } catch {
    // DB not available, fall through
  }

  // Fallback to runtime env vars
  const runtimeConfig = useRuntimeConfig()
  const { googleServiceAccountEmail, googleServiceAccountPrivateKey } = runtimeConfig

  if (!googleServiceAccountEmail || !googleServiceAccountPrivateKey) {
    throw new Error('Google service account not configured. Go to Settings > Google Workspace to set up credentials.')
  }

  return {
    email: googleServiceAccountEmail as string,
    privateKey: googleServiceAccountPrivateKey as string
  }
}

/**
 * List events from an attorney's calendar
 */
export async function listCalendarEvents(
  attorneyEmail: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 250
): Promise<CalendarEvent[]> {
  const accessToken = await getCachedAccessToken(attorneyEmail)
  const calendarId = 'primary'

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
    throw new Error(`Failed to list events for ${attorneyEmail}: ${error}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Create a new calendar event on an attorney's calendar
 */
export async function createCalendarEvent(
  attorneyEmail: string,
  event: CalendarEvent
): Promise<CalendarEvent> {
  const accessToken = await getCachedAccessToken(attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
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
 */
export async function updateCalendarEvent(
  attorneyEmail: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const accessToken = await getCachedAccessToken(attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
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
 */
export async function deleteCalendarEvent(
  attorneyEmail: string,
  eventId: string
): Promise<void> {
  const accessToken = await getCachedAccessToken(attorneyEmail)
  const calendarId = 'primary'

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
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
 */
export async function getFreeBusy(
  attorneyEmail: string,
  timeMin: string,
  timeMax: string
): Promise<FreeBusyPeriod[]> {
  const accessToken = await getCachedAccessToken(attorneyEmail)

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
        items: [{ id: attorneyEmail }]
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get free/busy: ${error}`)
  }

  const data = await response.json()
  const calendars = data.calendars || {}
  const calendarData = calendars[attorneyEmail] || {}
  return calendarData.busy || []
}

/**
 * List calendars visible to the impersonated user.
 * Useful for admin setup to discover attorney calendars.
 */
export async function listCalendarList(
  email: string
): Promise<CalendarListEntry[]> {
  const accessToken = await getCachedAccessToken(email)

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/users/me/calendarList`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list calendars for ${email}: ${error}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get free/busy information for multiple calendars in a single API call.
 * Returns the union of all busy periods across all calendars.
 * Useful for checking both attorney availability and room availability simultaneously.
 */
export async function getMultiCalendarFreeBusy(
  impersonateEmail: string,
  calendarEmails: string[],
  timeMin: string,
  timeMax: string
): Promise<FreeBusyPeriod[]> {
  if (calendarEmails.length === 0) return []

  const accessToken = await getCachedAccessToken(impersonateEmail)

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
        items: calendarEmails.map(id => ({ id }))
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get multi-calendar free/busy: ${error}`)
  }

  const data = await response.json()
  const calendars = data.calendars || {}

  // Collect all busy periods from all calendars
  const allBusy: FreeBusyPeriod[] = []
  for (const email of calendarEmails) {
    const calendarData = calendars[email] || {}
    const busy = calendarData.busy || []
    allBusy.push(...busy)
  }

  // Sort by start time and merge overlapping periods
  allBusy.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  if (allBusy.length <= 1) return allBusy

  const merged: FreeBusyPeriod[] = [{ ...allBusy[0]! }]
  for (let i = 1; i < allBusy.length; i++) {
    const last = merged[merged.length - 1]!
    const current = allBusy[i]!
    if (new Date(current.start) <= new Date(last.end)) {
      // Overlapping — extend end if needed
      if (new Date(current.end) > new Date(last.end)) {
        last.end = current.end
      }
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

/**
 * Check if the Google service account is configured (DB or env vars).
 * Used by the UI to gate features that depend on Google integration.
 */
export async function isServiceAccountConfigured(): Promise<boolean> {
  try {
    await getServiceAccountConfig()
    return true
  } catch {
    return false
  }
}
