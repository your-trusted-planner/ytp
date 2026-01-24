// Get a specific client by ID
import { requireRole } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])

  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq, and } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get client
  const client = await db.select()
    .from(schema.users)
    .where(and(
      eq(schema.users.id, clientId),
      eq(schema.users.role, 'CLIENT')
    ))
    .get()

  if (!client) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get client profile
  const profile = await db.select()
    .from(schema.clientProfiles)
    .where(eq(schema.clientProfiles.userId, clientId))
    .get()

  // Convert to snake_case for API compatibility
  return {
    client: {
      id: client.id,
      email: client.email,
      password: client.password,
      role: client.role,
      first_name: client.firstName,
      last_name: client.lastName,
      phone: client.phone,
      avatar: client.avatar,
      status: client.status,
      created_at: client.createdAt instanceof Date ? client.createdAt.getTime() : client.createdAt,
      updated_at: client.updatedAt instanceof Date ? client.updatedAt.getTime() : client.updatedAt
    },
    profile: profile ? {
      id: profile.id,
      user_id: profile.userId,
      date_of_birth: profile.dateOfBirth instanceof Date ? profile.dateOfBirth.getTime() : profile.dateOfBirth,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zipCode,
      has_minor_children: profile.hasMinorChildren ? 1 : 0,
      children_info: profile.childrenInfo,
      business_name: profile.businessName,
      business_type: profile.businessType,
      has_will: profile.hasWill ? 1 : 0,
      has_trust: profile.hasTrust ? 1 : 0,
      last_updated: profile.lastUpdated instanceof Date ? profile.lastUpdated.getTime() : profile.lastUpdated,
      assigned_lawyer_id: profile.assignedLawyerId,
      created_at: profile.createdAt instanceof Date ? profile.createdAt.getTime() : profile.createdAt,
      updated_at: profile.updatedAt instanceof Date ? profile.updatedAt.getTime() : profile.updatedAt,
      // Google Drive fields
      google_drive_folder_id: profile.googleDriveFolderId,
      google_drive_folder_url: profile.googleDriveFolderUrl,
      google_drive_sync_status: profile.googleDriveSyncStatus,
      google_drive_sync_error: profile.googleDriveSyncError,
      google_drive_last_sync_at: profile.googleDriveLastSyncAt instanceof Date
        ? Math.floor(profile.googleDriveLastSyncAt.getTime() / 1000)
        : profile.googleDriveLastSyncAt
    } : null
  }
})
