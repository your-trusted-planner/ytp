/**
 * GET /api/admin/google-drive/config
 * Get Google Drive configuration (without sensitive credentials)
 */

import { requireRole } from '../../../utils/rbac'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  const config = await db
    .select()
    .from(schema.googleDriveConfig)
    .get()

  if (!config) {
    return {
      success: true,
      config: null
    }
  }

  // Return config without sensitive credentials
  return {
    success: true,
    config: {
      id: config.id,
      isEnabled: config.isEnabled,
      serviceAccountEmail: config.serviceAccountEmail,
      // Don't return the private key for security
      hasPrivateKey: !!config.serviceAccountPrivateKey,
      sharedDriveId: config.sharedDriveId,
      rootFolderId: config.rootFolderId,
      rootFolderName: config.rootFolderName,
      impersonateEmail: config.impersonateEmail,
      matterSubfolders: JSON.parse(config.matterSubfolders),
      syncGeneratedDocuments: config.syncGeneratedDocuments,
      syncClientUploads: config.syncClientUploads,
      syncSignedDocuments: config.syncSignedDocuments,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }
  }
})
