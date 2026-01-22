// Get a single matter by ID
export default defineEventHandler(async (event) => {
  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get the matter
  const matter = await db.select()
    .from(schema.matters)
    .where(eq(schema.matters.id, matterId))
    .get()

  if (!matter) {
    throw createError({
      statusCode: 404,
      message: 'Matter not found'
    })
  }

  // Authorization: lawyers/admins can view any matter, clients can only view their own
  requireClientAccess(event, matter.clientId)

  // Get client info if exists
  let clientInfo = null
  if (matter.clientId) {
    const client = await db.select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
      .from(schema.users)
      .where(eq(schema.users.id, matter.clientId))
      .get()

    if (client) {
      clientInfo = {
        client_first_name: client.firstName,
        client_last_name: client.lastName,
        client_email: client.email
      }
    }
  }

  // Get lead attorney info if exists
  let attorneyInfo = null
  if (matter.leadAttorneyId) {
    const attorney = await db.select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
      .from(schema.users)
      .where(eq(schema.users.id, matter.leadAttorneyId))
      .get()

    if (attorney) {
      attorneyInfo = {
        lead_attorney_first_name: attorney.firstName,
        lead_attorney_last_name: attorney.lastName,
        lead_attorney_email: attorney.email
      }
    }
  }

  // Get engagement journey info if exists
  let engagementInfo = null
  if (matter.engagementJourneyId) {
    const clientJourney = await db.select()
      .from(schema.clientJourneys)
      .where(eq(schema.clientJourneys.id, matter.engagementJourneyId))
      .get()

    if (clientJourney?.journeyId) {
      const journey = await db.select({ name: schema.journeys.name })
        .from(schema.journeys)
        .where(eq(schema.journeys.id, clientJourney.journeyId))
        .get()

      if (journey) {
        engagementInfo = {
          engagement_journey_name: journey.name
        }
      }
    }
  }

  // Convert matter to snake_case for API compatibility
  return {
    matter: {
      id: matter.id,
      client_id: matter.clientId,
      title: matter.title,
      matter_number: matter.matterNumber,
      description: matter.description,
      status: matter.status,
      lead_attorney_id: matter.leadAttorneyId,
      engagement_journey_id: matter.engagementJourneyId,
      // Google Drive sync fields
      google_drive_folder_id: matter.googleDriveFolderId,
      google_drive_folder_url: matter.googleDriveFolderUrl,
      google_drive_sync_status: matter.googleDriveSyncStatus,
      google_drive_sync_error: matter.googleDriveSyncError,
      google_drive_last_sync_at: matter.googleDriveLastSyncAt instanceof Date
        ? Math.floor(matter.googleDriveLastSyncAt.getTime() / 1000)
        : matter.googleDriveLastSyncAt,
      google_drive_subfolder_ids: matter.googleDriveSubfolderIds,
      // Timestamps
      created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
      updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt,
      ...clientInfo,
      ...attorneyInfo,
      ...engagementInfo
    }
  }
})
