/**
 * POST /api/google-drive/sync/client/[id]
 * Manually trigger Google Drive folder creation for a client
 *
 * Query params:
 *   - force=true: Clear existing folder reference and create new folder in current configured drive
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../../../utils/rbac'
import { isDriveEnabled, createClientFolder, getFile, getDriveConfig } from '../../../../utils/google-drive'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'LAWYER'])

  const clientId = getRouterParam(event, 'id')
  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const query = getQuery(event)
  const forceResync = query.force === 'true'

  // Check if Drive is enabled
  if (!await isDriveEnabled()) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive integration is not enabled'
    })
  }

  const { useDrizzle, schema } = await import('../../../../db')
  const db = useDrizzle()

  // Get client info
  const client = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      googleDriveFolderId: schema.clientProfiles.googleDriveFolderId,
      googleDriveFolderUrl: schema.clientProfiles.googleDriveFolderUrl
    })
    .from(schema.users)
    .leftJoin(schema.clientProfiles, eq(schema.users.id, schema.clientProfiles.userId))
    .where(eq(schema.users.id, clientId))
    .get()

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // If folder exists and not forcing resync, verify it's still accessible
  if (client.googleDriveFolderId && !forceResync) {
    try {
      // Try to access the existing folder
      const existingFolder = await getFile(client.googleDriveFolderId)

      // Folder exists and is accessible
      return {
        success: true,
        message: 'Client already has a Google Drive folder',
        folderId: client.googleDriveFolderId,
        folderUrl: existingFolder.webViewLink || client.googleDriveFolderUrl,
        alreadyExists: true
      }
    } catch (error) {
      // Folder is not accessible - it may have been deleted or is in a different drive
      // We'll fall through to create a new one
      console.warn(`Existing folder ${client.googleDriveFolderId} not accessible, will create new folder:`, error)

      // Clear the old folder reference
      await db.update(schema.clientProfiles)
        .set({
          googleDriveFolderId: null,
          googleDriveFolderUrl: null,
          googleDriveSyncStatus: 'NOT_SYNCED',
          googleDriveSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(schema.clientProfiles.userId, clientId))
    }
  }

  // If forcing resync, clear existing folder reference first
  if (forceResync && client.googleDriveFolderId) {
    await db.update(schema.clientProfiles)
      .set({
        googleDriveFolderId: null,
        googleDriveFolderUrl: null,
        googleDriveSyncStatus: 'NOT_SYNCED',
        googleDriveSyncError: null,
        updatedAt: new Date()
      })
      .where(eq(schema.clientProfiles.userId, clientId))
  }

  try {
    const clientName = `${client.lastName || ''}, ${client.firstName || ''}`.trim() || 'Unknown Client'
    const folder = await createClientFolder(clientId, clientName)

    return {
      success: true,
      message: forceResync ? 'Google Drive folder recreated in current drive' : 'Google Drive folder created successfully',
      folderId: folder.id,
      folderUrl: folder.webViewLink
    }
  } catch (error) {
    // Update status to ERROR
    await db.update(schema.clientProfiles)
      .set({
        googleDriveSyncStatus: 'ERROR',
        googleDriveSyncError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      })
      .where(eq(schema.clientProfiles.userId, clientId))

    throw createError({
      statusCode: 500,
      message: `Failed to create Google Drive folder: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
