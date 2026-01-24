/**
 * GET /api/google-drive/browse/[folderId]
 * Browse contents of a Google Drive folder
 * Returns files and subfolders for tree view navigation
 */

import { requireRole } from '../../../utils/rbac'
import { getDriveConfig, isDriveEnabled } from '../../../utils/google-drive'

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive'

interface DriveItem {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  webContentLink?: string
  modifiedTime?: string
  size?: string
  iconLink?: string
  isFolder: boolean
}

/**
 * Create a JWT for Google Service Account authentication
 */
async function createJWT(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string | null
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims: Record<string, any> = {
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

/**
 * Get access token using service account JWT
 */
async function getAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string | null
): Promise<string> {
  const jwt = await createJWT(serviceAccountEmail, privateKey, impersonateEmail)

  const response = await fetch(GOOGLE_TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])

  const folderId = getRouterParam(event, 'folderId')

  if (!folderId) {
    throw createError({
      statusCode: 400,
      message: 'Folder ID is required'
    })
  }

  // Check if Drive is enabled
  if (!await isDriveEnabled()) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive integration is not enabled'
    })
  }

  const config = await getDriveConfig()
  if (!config) {
    throw createError({
      statusCode: 500,
      message: 'Google Drive configuration not found'
    })
  }

  try {
    const accessToken = await getAccessToken(
      config.serviceAccountEmail,
      config.serviceAccountPrivateKey,
      config.impersonateEmail
    )

    // Query for files and folders in this folder
    const query = `'${folderId}' in parents and trashed=false`
    const fields = 'files(id,name,mimeType,webViewLink,webContentLink,modifiedTime,size,iconLink)'

    const params = new URLSearchParams({
      q: query,
      fields,
      orderBy: 'folder,name',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    })

    // Add corpora and driveId if we have a shared drive
    if (config.sharedDriveId) {
      params.set('corpora', 'drive')
      params.set('driveId', config.sharedDriveId)
    }

    const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to list folder contents: ${error}`)
    }

    const data = await response.json()
    const items: DriveItem[] = (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      modifiedTime: file.modifiedTime,
      size: file.size,
      iconLink: file.iconLink,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    }))

    // Sort: folders first, then by name
    items.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })

    // Get folder metadata for breadcrumb/title
    const folderParams = new URLSearchParams({
      fields: 'id,name,webViewLink',
      supportsAllDrives: 'true'
    })

    const folderResponse = await fetch(
      `${GOOGLE_DRIVE_API}/files/${folderId}?${folderParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    let folderInfo = { id: folderId, name: 'Folder', webViewLink: '' }
    if (folderResponse.ok) {
      folderInfo = await folderResponse.json()
    }

    return {
      folder: folderInfo,
      items,
      itemCount: items.length
    }
  } catch (error) {
    console.error('Google Drive browse error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to browse Google Drive folder'
    })
  }
})
