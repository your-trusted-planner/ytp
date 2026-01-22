/**
 * Google Drive API Integration (Service Account)
 * Uses JWT-based service account authentication with domain-wide delegation
 * Documentation: https://developers.google.com/drive/api/v3/reference
 */

import { eq } from 'drizzle-orm'

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3'
const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive'

// ===================================
// TYPES
// ===================================

export interface DriveConfig {
  id: string
  isEnabled: boolean
  serviceAccountEmail: string
  serviceAccountPrivateKey: string
  sharedDriveId: string
  rootFolderId: string | null
  rootFolderName: string
  impersonateEmail: string | null
  matterSubfolders: string[]
  syncGeneratedDocuments: boolean
  syncClientUploads: boolean
  syncSignedDocuments: boolean
}

export interface DriveFolder {
  id: string
  name: string
  webViewLink: string
  parents?: string[]
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  webContentLink?: string
  parents?: string[]
}

export interface SyncResult {
  success: boolean
  fileId?: string
  fileUrl?: string
  error?: string
}

// ===================================
// AUTHENTICATION
// ===================================

/**
 * Create a JWT for Google Service Account authentication
 * Uses Web Crypto API (compatible with Cloudflare Workers)
 */
async function createJWT(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string | null
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  // JWT claims (with optional impersonation)
  const claims: Record<string, any> = {
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
 */
async function getAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
  impersonateEmail?: string | null
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

// ===================================
// CONFIG HELPERS
// ===================================

/**
 * Get Google Drive configuration from database
 */
export async function getDriveConfig(): Promise<DriveConfig | null> {
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const config = await db
    .select()
    .from(schema.googleDriveConfig)
    .get()

  if (!config) return null

  return {
    id: config.id,
    isEnabled: config.isEnabled,
    serviceAccountEmail: config.serviceAccountEmail || '',
    serviceAccountPrivateKey: config.serviceAccountPrivateKey || '',
    sharedDriveId: config.sharedDriveId || '',
    rootFolderId: config.rootFolderId,
    rootFolderName: config.rootFolderName,
    impersonateEmail: config.impersonateEmail,
    matterSubfolders: JSON.parse(config.matterSubfolders),
    syncGeneratedDocuments: config.syncGeneratedDocuments,
    syncClientUploads: config.syncClientUploads,
    syncSignedDocuments: config.syncSignedDocuments
  }
}

/**
 * Check if Google Drive integration is enabled and configured
 */
export async function isDriveEnabled(): Promise<boolean> {
  const config = await getDriveConfig()
  return !!(
    config?.isEnabled &&
    config.serviceAccountEmail &&
    config.serviceAccountPrivateKey &&
    config.sharedDriveId
  )
}

/**
 * Get access token using stored config
 */
async function getConfiguredAccessToken(): Promise<string> {
  const config = await getDriveConfig()
  if (!config || !config.isEnabled) {
    throw new Error('Google Drive integration is not enabled')
  }
  if (!config.serviceAccountEmail || !config.serviceAccountPrivateKey) {
    throw new Error('Google Drive service account not configured')
  }

  return getAccessToken(
    config.serviceAccountEmail,
    config.serviceAccountPrivateKey,
    config.impersonateEmail
  )
}

// ===================================
// FOLDER OPERATIONS
// ===================================

/**
 * Create a folder in Google Drive
 */
export async function createFolder(
  name: string,
  parentId?: string,
  config?: DriveConfig
): Promise<DriveFolder> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  const metadata: Record<string, any> = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  }

  // Set parent folder - use provided parentId, or root folder, or Shared Drive root
  if (parentId) {
    metadata.parents = [parentId]
  } else if (driveConfig.rootFolderId) {
    metadata.parents = [driveConfig.rootFolderId]
  } else if (driveConfig.sharedDriveId) {
    metadata.parents = [driveConfig.sharedDriveId]
  }

  const params = new URLSearchParams({
    supportsAllDrives: 'true'
  })

  const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create folder: ${error}`)
  }

  const folder = await response.json()

  // Get the webViewLink
  const detailsResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files/${folder.id}?fields=id,name,webViewLink&supportsAllDrives=true`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!detailsResponse.ok) {
    return { id: folder.id, name: folder.name, webViewLink: '' }
  }

  return detailsResponse.json()
}

/**
 * Find a folder by name within a parent folder
 */
export async function findFolder(
  name: string,
  parentId?: string,
  config?: DriveConfig
): Promise<DriveFolder | null> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  const parent = parentId || driveConfig.rootFolderId || driveConfig.sharedDriveId
  const query = `name='${name.replace(/'/g, "\\'")}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,webViewLink)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    corpora: 'drive',
    driveId: driveConfig.sharedDriveId
  })

  const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to find folder: ${error}`)
  }

  const data = await response.json()
  return data.files?.[0] || null
}

/**
 * Get or create a folder (idempotent operation)
 */
export async function getOrCreateFolder(
  name: string,
  parentId?: string,
  config?: DriveConfig
): Promise<DriveFolder> {
  const existing = await findFolder(name, parentId, config)
  if (existing) return existing
  return createFolder(name, parentId, config)
}

/**
 * Create matter subfolders inside a matter folder
 */
export async function createMatterSubfolders(
  matterFolderId: string,
  subfolders: string[],
  config?: DriveConfig
): Promise<Record<string, DriveFolder>> {
  const results: Record<string, DriveFolder> = {}

  for (const subfolderName of subfolders) {
    const folder = await getOrCreateFolder(subfolderName, matterFolderId, config)
    results[subfolderName] = folder
  }

  return results
}

// ===================================
// FILE OPERATIONS
// ===================================

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
  name: string,
  content: ArrayBuffer | Uint8Array,
  mimeType: string,
  parentFolderId: string,
  config?: DriveConfig
): Promise<DriveFile> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  // Create multipart request
  const boundary = '-------' + Date.now().toString(36)

  const metadata = JSON.stringify({
    name,
    parents: [parentFolderId]
  })

  // Build multipart body
  const contentArray = content instanceof Uint8Array ? content : new Uint8Array(content)
  const encoder = new TextEncoder()

  const metadataPart = encoder.encode(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata + '\r\n'
  )

  const filePart = encoder.encode(
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  )

  const closingPart = encoder.encode(`\r\n--${boundary}--`)

  // Combine all parts
  const body = new Uint8Array(
    metadataPart.length + filePart.length + contentArray.length + closingPart.length
  )
  let offset = 0
  body.set(metadataPart, offset); offset += metadataPart.length
  body.set(filePart, offset); offset += filePart.length
  body.set(contentArray, offset); offset += contentArray.length
  body.set(closingPart, offset)

  const params = new URLSearchParams({
    uploadType: 'multipart',
    supportsAllDrives: 'true',
    fields: 'id,name,mimeType,webViewLink,webContentLink'
  })

  const response = await fetch(`${GOOGLE_UPLOAD_API}/files?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload file: ${error}`)
  }

  return response.json()
}

/**
 * Update an existing file's content
 */
export async function updateFile(
  fileId: string,
  content: ArrayBuffer | Uint8Array,
  mimeType: string,
  config?: DriveConfig
): Promise<DriveFile> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  const params = new URLSearchParams({
    uploadType: 'media',
    supportsAllDrives: 'true',
    fields: 'id,name,mimeType,webViewLink,webContentLink'
  })

  const response = await fetch(`${GOOGLE_UPLOAD_API}/files/${fileId}?${params}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': mimeType
    },
    body: content
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update file: ${error}`)
  }

  return response.json()
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFile(
  fileId: string,
  config?: DriveConfig
): Promise<void> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  const params = new URLSearchParams({
    supportsAllDrives: 'true'
  })

  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?${params}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete file: ${error}`)
  }
}

/**
 * Get file metadata
 */
export async function getFile(
  fileId: string,
  config?: DriveConfig
): Promise<DriveFile> {
  const driveConfig = config || await getDriveConfig()
  if (!driveConfig) throw new Error('Google Drive not configured')

  const accessToken = await getAccessToken(
    driveConfig.serviceAccountEmail,
    driveConfig.serviceAccountPrivateKey,
    driveConfig.impersonateEmail
  )

  const params = new URLSearchParams({
    supportsAllDrives: 'true',
    fields: 'id,name,mimeType,webViewLink,webContentLink,parents'
  })

  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get file: ${error}`)
  }

  return response.json()
}

// ===================================
// HIGH-LEVEL SYNC OPERATIONS
// ===================================

/**
 * Create a client folder in Google Drive
 * Folder name format: "LastName, FirstName" or "LastName, FirstName & SpouseFirstName"
 */
export async function createClientFolder(
  clientId: string,
  clientName: string
): Promise<DriveFolder> {
  const config = await getDriveConfig()
  if (!config || !config.isEnabled) {
    throw new Error('Google Drive integration is not enabled')
  }

  const folder = await getOrCreateFolder(clientName, config.rootFolderId || undefined, config)

  // Update the client profile with folder info
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  await db.update(schema.clientProfiles)
    .set({
      googleDriveFolderId: folder.id,
      googleDriveFolderUrl: folder.webViewLink,
      googleDriveSyncStatus: 'SYNCED',
      googleDriveSyncError: null,
      googleDriveLastSyncAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.clientProfiles.userId, clientId))

  return folder
}

/**
 * Create a matter folder with subfolders in Google Drive
 * Folder name format: "Matter Title - Matter Number"
 */
export async function createMatterFolder(
  matterId: string,
  matterTitle: string,
  matterNumber: string,
  clientFolderId: string
): Promise<{ folder: DriveFolder; subfolders: Record<string, DriveFolder> }> {
  const config = await getDriveConfig()
  if (!config || !config.isEnabled) {
    throw new Error('Google Drive integration is not enabled')
  }

  const folderName = `${matterTitle} - ${matterNumber}`
  const folder = await getOrCreateFolder(folderName, clientFolderId, config)

  // Create subfolders
  const subfolders = await createMatterSubfolders(folder.id, config.matterSubfolders, config)

  // Update the matter with folder info
  const { useDrizzle, schema } = await import('../db')
  const db = useDrizzle()

  const subfolderIds: Record<string, string> = {}
  for (const [name, subfolder] of Object.entries(subfolders)) {
    subfolderIds[name] = subfolder.id
  }

  await db.update(schema.matters)
    .set({
      googleDriveFolderId: folder.id,
      googleDriveFolderUrl: folder.webViewLink,
      googleDriveSubfolderIds: JSON.stringify(subfolderIds),
      googleDriveSyncStatus: 'SYNCED',
      googleDriveSyncError: null,
      googleDriveLastSyncAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.matters.id, matterId))

  return { folder, subfolders }
}

/**
 * Sync a document to Google Drive
 * Downloads from R2, uploads to appropriate Drive folder
 */
export async function syncDocumentToDrive(documentId: string): Promise<SyncResult> {
  const { useDrizzle, schema } = await import('../db')
  const { blob } = await import('hub:blob')

  const db = useDrizzle()
  const config = await getDriveConfig()

  if (!config || !config.isEnabled) {
    return { success: false, error: 'Google Drive integration is not enabled' }
  }

  try {
    // Get document
    const doc = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, documentId))
      .get()

    if (!doc) {
      return { success: false, error: 'Document not found' }
    }

    // Get matter to find folder
    if (!doc.matterId) {
      return { success: false, error: 'Document has no associated matter' }
    }

    const matter = await db
      .select()
      .from(schema.matters)
      .where(eq(schema.matters.id, doc.matterId))
      .get()

    if (!matter?.googleDriveSubfolderIds) {
      return { success: false, error: 'Matter has no Google Drive folder' }
    }

    const subfolderIds = JSON.parse(matter.googleDriveSubfolderIds)

    // Determine which subfolder to use
    let targetFolderId: string
    if (doc.signedPdfBlobKey && config.syncSignedDocuments) {
      targetFolderId = subfolderIds['Signed Documents']
    } else if (config.syncGeneratedDocuments) {
      targetFolderId = subfolderIds['Generated Documents']
    } else {
      return { success: false, error: 'Document sync not enabled for this type' }
    }

    if (!targetFolderId) {
      return { success: false, error: 'Target folder not found' }
    }

    // Download from R2
    const blobKey = doc.signedPdfBlobKey || doc.docxBlobKey
    if (!blobKey) {
      return { success: false, error: 'No file to sync' }
    }

    const blobData = await blob.get(blobKey)
    if (!blobData) {
      return { success: false, error: 'File not found in storage' }
    }

    const content = await blobData.arrayBuffer()
    const fileName = blobKey.split('/').pop() || `${doc.title}.docx`
    const mimeType = doc.signedPdfBlobKey
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Upload to Drive (update if exists, create if not)
    let driveFile: DriveFile
    if (doc.googleDriveFileId) {
      driveFile = await updateFile(doc.googleDriveFileId, content, mimeType, config)
    } else {
      driveFile = await uploadFile(fileName, content, mimeType, targetFolderId, config)
    }

    // Update document record
    await db.update(schema.documents)
      .set({
        googleDriveFileId: driveFile.id,
        googleDriveFileUrl: driveFile.webViewLink,
        googleDriveSyncStatus: 'SYNCED',
        googleDriveSyncError: null,
        googleDriveSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, documentId))

    return {
      success: true,
      fileId: driveFile.id,
      fileUrl: driveFile.webViewLink
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update document with error status
    await db.update(schema.documents)
      .set({
        googleDriveSyncStatus: 'ERROR',
        googleDriveSyncError: errorMessage,
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, documentId))

    return { success: false, error: errorMessage }
  }
}

/**
 * Sync a document upload to Google Drive
 */
export async function syncUploadToDrive(uploadId: string): Promise<SyncResult> {
  const { useDrizzle, schema } = await import('../db')
  const { blob } = await import('hub:blob')

  const db = useDrizzle()
  const config = await getDriveConfig()

  if (!config || !config.isEnabled || !config.syncClientUploads) {
    return { success: false, error: 'Client upload sync is not enabled' }
  }

  try {
    // Get upload
    const upload = await db
      .select()
      .from(schema.documentUploads)
      .where(eq(schema.documentUploads.id, uploadId))
      .get()

    if (!upload) {
      return { success: false, error: 'Upload not found' }
    }

    // Get client journey to find matter
    if (!upload.clientJourneyId) {
      return { success: false, error: 'Upload has no associated journey' }
    }

    const journey = await db
      .select()
      .from(schema.clientJourneys)
      .where(eq(schema.clientJourneys.id, upload.clientJourneyId))
      .get()

    if (!journey?.matterId) {
      return { success: false, error: 'Journey has no associated matter' }
    }

    const matter = await db
      .select()
      .from(schema.matters)
      .where(eq(schema.matters.id, journey.matterId))
      .get()

    if (!matter?.googleDriveSubfolderIds) {
      return { success: false, error: 'Matter has no Google Drive folder' }
    }

    const subfolderIds = JSON.parse(matter.googleDriveSubfolderIds)
    const targetFolderId = subfolderIds['Client Uploads']

    if (!targetFolderId) {
      return { success: false, error: 'Client Uploads folder not found' }
    }

    // Download from R2
    const blobData = await blob.get(upload.filePath)
    if (!blobData) {
      return { success: false, error: 'File not found in storage' }
    }

    const content = await blobData.arrayBuffer()

    // Upload to Drive (update if exists, create if not)
    let driveFile: DriveFile
    if (upload.googleDriveFileId) {
      driveFile = await updateFile(upload.googleDriveFileId, content, upload.mimeType, config)
    } else {
      driveFile = await uploadFile(upload.originalFileName, content, upload.mimeType, targetFolderId, config)
    }

    // Update upload record
    await db.update(schema.documentUploads)
      .set({
        googleDriveFileId: driveFile.id,
        googleDriveFileUrl: driveFile.webViewLink,
        googleDriveSyncStatus: 'SYNCED',
        googleDriveSyncError: null,
        googleDriveSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.documentUploads.id, uploadId))

    return {
      success: true,
      fileId: driveFile.id,
      fileUrl: driveFile.webViewLink
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update upload with error status
    await db.update(schema.documentUploads)
      .set({
        googleDriveSyncStatus: 'ERROR',
        googleDriveSyncError: errorMessage,
        updatedAt: new Date()
      })
      .where(eq(schema.documentUploads.id, uploadId))

    return { success: false, error: errorMessage }
  }
}

// ===================================
// TEST / VALIDATION
// ===================================

/**
 * List all shared drives accessible by the service account
 */
export async function listAccessibleSharedDrives(config: {
  serviceAccountEmail: string
  serviceAccountPrivateKey: string
  impersonateEmail?: string | null
}): Promise<{ success: boolean; drives?: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const accessToken = await getAccessToken(
      config.serviceAccountEmail,
      config.serviceAccountPrivateKey,
      config.impersonateEmail
    )

    const params = new URLSearchParams({
      pageSize: '100',
      fields: 'drives(id,name)'
    })

    const response = await fetch(
      `${GOOGLE_DRIVE_API}/drives?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Failed to list shared drives: ${error}` }
    }

    const data = await response.json()
    return { success: true, drives: data.drives || [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test Google Drive connection and permissions
 */
export async function testDriveConnection(config: {
  serviceAccountEmail: string
  serviceAccountPrivateKey: string
  sharedDriveId: string
  impersonateEmail?: string | null
}): Promise<{ success: boolean; error?: string; driveName?: string; accessibleDrives?: Array<{ id: string; name: string }> }> {
  try {
    const accessToken = await getAccessToken(
      config.serviceAccountEmail,
      config.serviceAccountPrivateKey,
      config.impersonateEmail
    )

    // First, list all accessible shared drives for diagnostics
    const listParams = new URLSearchParams({
      pageSize: '100',
      fields: 'drives(id,name)'
    })

    const listResponse = await fetch(
      `${GOOGLE_DRIVE_API}/drives?${listParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    let accessibleDrives: Array<{ id: string; name: string }> = []
    if (listResponse.ok) {
      const listData = await listResponse.json()
      accessibleDrives = listData.drives || []
    }

    // Try to get the specific Shared Drive info
    const params = new URLSearchParams({
      supportsAllDrives: 'true'
    })

    const response = await fetch(
      `${GOOGLE_DRIVE_API}/drives/${config.sharedDriveId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()

      // Provide helpful diagnostic info
      let diagnosticMessage = `Failed to access Shared Drive: ${error}`
      if (accessibleDrives.length > 0) {
        diagnosticMessage += `\n\nThe service account CAN access these ${accessibleDrives.length} shared drive(s):\n`
        accessibleDrives.forEach(d => {
          diagnosticMessage += `  - "${d.name}" (ID: ${d.id})\n`
        })
        diagnosticMessage += `\nCheck if the Shared Drive ID "${config.sharedDriveId}" matches one of these.`
      } else {
        diagnosticMessage += `\n\nThe service account cannot access ANY shared drives. Please verify:\n`
        diagnosticMessage += `  1. The service account is added as a member (not just shared with) of the Shared Drive\n`
        diagnosticMessage += `  2. The service account has "Content Manager" or higher role\n`
        diagnosticMessage += `  3. If using impersonation, the impersonated user has access to the Shared Drive`
      }

      return { success: false, error: diagnosticMessage, accessibleDrives }
    }

    const drive = await response.json()
    return { success: true, driveName: drive.name, accessibleDrives }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
