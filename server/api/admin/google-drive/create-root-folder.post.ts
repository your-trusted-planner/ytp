/**
 * POST /api/admin/google-drive/create-root-folder
 * Create the root folder in Google Drive Shared Drive
 */

import { eq } from 'drizzle-orm'
import { requireRole } from '../../../utils/auth'
import { getDriveConfig, createFolder } from '../../../utils/google-drive'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const config = await getDriveConfig()
  if (!config) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive is not configured'
    })
  }

  if (!config.isEnabled) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive integration is not enabled'
    })
  }

  if (!config.serviceAccountEmail || !config.serviceAccountPrivateKey || !config.sharedDriveId) {
    throw createError({
      statusCode: 400,
      message: 'Google Drive service account or Shared Drive not configured'
    })
  }

  // Check if root folder already exists
  if (config.rootFolderId) {
    return {
      success: true,
      message: 'Root folder already exists',
      folderId: config.rootFolderId
    }
  }

  try {
    // Create the root folder in the Shared Drive
    const folder = await createFolder(
      config.rootFolderName,
      config.sharedDriveId, // Parent is the Shared Drive root
      config
    )

    // Update config with the new root folder ID
    const { useDrizzle, schema } = await import('../../../db')
    const db = useDrizzle()

    await db.update(schema.googleDriveConfig)
      .set({
        rootFolderId: folder.id,
        updatedAt: new Date()
      })
      .where(eq(schema.googleDriveConfig.id, config.id))

    return {
      success: true,
      message: `Created root folder: ${config.rootFolderName}`,
      folderId: folder.id,
      folderUrl: folder.webViewLink
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to create root folder: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
