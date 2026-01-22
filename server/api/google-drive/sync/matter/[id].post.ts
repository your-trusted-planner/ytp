/**
 * POST /api/google-drive/sync/matter/[id]
 * Manually trigger Google Drive folder creation for a matter
 *
 * Query params:
 *   - force=true: Clear existing folder reference and create new folder in current configured drive
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../../../utils/auth'
import { isDriveEnabled, createMatterFolder, getFile } from '../../../../utils/google-drive'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'LAWYER'])

  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
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

  // Get matter info
  const matter = await db
    .select()
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .get()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // If folder exists and not forcing resync, verify it's still accessible
  if (matter.googleDriveFolderId && !forceResync) {
    try {
      // Try to access the existing folder
      const existingFolder = await getFile(matter.googleDriveFolderId)

      // Folder exists and is accessible
      return {
        success: true,
        message: 'Matter already has a Google Drive folder',
        folderId: matter.googleDriveFolderId,
        folderUrl: existingFolder.webViewLink || matter.googleDriveFolderUrl,
        alreadyExists: true
      }
    } catch (error) {
      // Folder is not accessible - it may have been deleted or is in a different drive
      console.warn(`Existing folder ${matter.googleDriveFolderId} not accessible, will create new folder:`, error)

      // Clear the old folder reference
      await db.update(schema.matters)
        .set({
          googleDriveFolderId: null,
          googleDriveFolderUrl: null,
          googleDriveSubfolderIds: null,
          googleDriveSyncStatus: 'NOT_SYNCED',
          googleDriveSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(schema.matters.id, matterId))
    }
  }

  // If forcing resync, clear existing folder reference first
  if (forceResync && matter.googleDriveFolderId) {
    await db.update(schema.matters)
      .set({
        googleDriveFolderId: null,
        googleDriveFolderUrl: null,
        googleDriveSubfolderIds: null,
        googleDriveSyncStatus: 'NOT_SYNCED',
        googleDriveSyncError: null,
        updatedAt: new Date()
      })
      .where(eq(schema.matters.id, matterId))
  }

  // Get client profile to find parent folder
  const clientProfile = await db
    .select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, matter.clientId))
    .get()

  if (!clientProfile?.googleDriveFolderId) {
    throw createError({
      statusCode: 400,
      message: 'Client does not have a Google Drive folder. Please sync the client first.'
    })
  }

  // Verify the client folder is still accessible
  try {
    await getFile(clientProfile.googleDriveFolderId)
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: 'Client Google Drive folder is not accessible. Please resync the client folder first.'
    })
  }

  try {
    const { folder, subfolders } = await createMatterFolder(
      matterId,
      matter.title,
      matter.matterNumber || 'NO-NUMBER',
      clientProfile.googleDriveFolderId
    )

    return {
      success: true,
      message: forceResync ? 'Google Drive folder recreated in current drive' : 'Google Drive folder created successfully',
      folderId: folder.id,
      folderUrl: folder.webViewLink,
      subfolders: Object.keys(subfolders)
    }
  } catch (error) {
    // Update status to ERROR
    await db.update(schema.matters)
      .set({
        googleDriveSyncStatus: 'ERROR',
        googleDriveSyncError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      })
      .where(eq(schema.matters.id, matterId))

    throw createError({
      statusCode: 500,
      message: `Failed to create Google Drive folder: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
