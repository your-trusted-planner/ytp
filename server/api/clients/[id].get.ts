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

  // Get user record (clients are users with role='CLIENT')
  const user = await db.select()
    .from(schema.users)
    .where(and(
      eq(schema.users.id, clientId),
      eq(schema.users.role, 'CLIENT')
    ))
    .get()

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get client record from clients table (linked via personId)
  let clientRecord = null
  if (user.personId) {
    clientRecord = await db.select()
      .from(schema.clients)
      .where(eq(schema.clients.personId, user.personId))
      .get()
  }

  // Get person record for address/contact info
  let person = null
  if (user.personId) {
    person = await db.select()
      .from(schema.people)
      .where(eq(schema.people.id, user.personId))
      .get()
  }

  return {
    client: {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      person_id: user.personId,
      created_at: user.createdAt instanceof Date ? user.createdAt.getTime() : user.createdAt,
      updated_at: user.updatedAt instanceof Date ? user.updatedAt.getTime() : user.updatedAt
    },
    profile: clientRecord ? {
      id: clientRecord.id,
      user_id: clientId,
      // Address from person record
      address: person?.address,
      city: person?.city,
      state: person?.state,
      zip_code: person?.zipCode,
      date_of_birth: person?.dateOfBirth instanceof Date ? person.dateOfBirth.getTime() : person?.dateOfBirth,
      // Client-specific fields
      has_minor_children: clientRecord.hasMinorChildren ? 1 : 0,
      children_info: clientRecord.childrenInfo,
      business_name: clientRecord.businessName,
      business_type: clientRecord.businessType,
      has_will: clientRecord.hasWill ? 1 : 0,
      has_trust: clientRecord.hasTrust ? 1 : 0,
      assigned_lawyer_id: clientRecord.assignedLawyerId,
      created_at: clientRecord.createdAt instanceof Date ? clientRecord.createdAt.getTime() : clientRecord.createdAt,
      updated_at: clientRecord.updatedAt instanceof Date ? clientRecord.updatedAt.getTime() : clientRecord.updatedAt,
      // Google Drive fields
      google_drive_folder_id: clientRecord.googleDriveFolderId,
      google_drive_folder_url: clientRecord.googleDriveFolderUrl,
      google_drive_sync_status: clientRecord.googleDriveSyncStatus,
      google_drive_sync_error: clientRecord.googleDriveSyncError,
      google_drive_last_sync_at: clientRecord.googleDriveLastSyncAt instanceof Date
        ? Math.floor(clientRecord.googleDriveLastSyncAt.getTime() / 1000)
        : clientRecord.googleDriveLastSyncAt
    } : null
  }
})
