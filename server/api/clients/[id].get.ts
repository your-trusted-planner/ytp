// Get a specific client by ID
// Uses the clients table as the primary lookup (Belly Button Principle)
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
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get client record from clients table (primary lookup)
  const clientRecord = await db.select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .get()

  if (!clientRecord) {
    throw createError({
      statusCode: 404,
      message: 'Client not found'
    })
  }

  // Get person record for name/contact info
  const person = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, clientRecord.personId))
    .get()

  if (!person) {
    throw createError({
      statusCode: 404,
      message: 'Client person record not found'
    })
  }

  // Optionally get user record if client has portal access
  const user = await db.select()
    .from(schema.users)
    .where(eq(schema.users.personId, clientRecord.personId))
    .get()

  return {
    client: {
      id: clientRecord.id,
      personId: clientRecord.personId,
      email: person.email,
      first_name: person.firstName,
      last_name: person.lastName,
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: person.fullName,
      phone: person.phone,
      avatar: user?.avatar,
      status: clientRecord.status,
      person_id: clientRecord.personId,
      // User info if they have portal access
      userId: user?.id,
      role: user?.role,
      created_at: clientRecord.createdAt instanceof Date ? clientRecord.createdAt.getTime() : clientRecord.createdAt,
      updated_at: clientRecord.updatedAt instanceof Date ? clientRecord.updatedAt.getTime() : clientRecord.updatedAt
    },
    profile: {
      id: clientRecord.id,
      client_id: clientRecord.id,
      // Address from person record
      address: person.address,
      city: person.city,
      state: person.state,
      zip_code: person.zipCode,
      date_of_birth: person.dateOfBirth instanceof Date ? person.dateOfBirth.getTime() : person.dateOfBirth,
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
    }
  }
})
