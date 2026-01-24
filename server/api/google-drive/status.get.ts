/**
 * GET /api/google-drive/status
 * Check if Google Drive integration is enabled and configured
 * This is a lightweight check available to all authenticated users
 */

export default defineEventHandler(async (event) => {
  const { useDrizzle, schema } = await import('../../db')
  const db = useDrizzle()

  const config = await db
    .select({
      isEnabled: schema.googleDriveConfig.isEnabled,
      sharedDriveId: schema.googleDriveConfig.sharedDriveId,
      serviceAccountEmail: schema.googleDriveConfig.serviceAccountEmail
    })
    .from(schema.googleDriveConfig)
    .get()

  // Drive is configured if enabled and has credentials + shared drive ID
  // Root folder is optional - the Shared Drive itself can be the root
  const isConfigured = !!(
    config?.isEnabled &&
    config?.sharedDriveId &&
    config?.serviceAccountEmail
  )

  return {
    success: true,
    isEnabled: config?.isEnabled ?? false,
    isConfigured
  }
})
