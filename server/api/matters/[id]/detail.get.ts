// Composite matter detail endpoint
// Combines 4 individual API calls into a single response for the matter detail page
// Replaces: /api/matters/:id, /api/matters/:id/services,
//           /api/client-journeys/matter/:id, /api/payments/matter/:id

export default defineEventHandler(async (event) => {
  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // 1. Get the matter
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

  // Run all independent queries in parallel
  const [clientInfo, attorneyInfo, engagementInfo, services, journeyRows, payments] = await Promise.all([
    // Client info (resolve user -> person -> clients table)
    fetchClientInfo(db, schema, matter.clientId),

    // Lead attorney info
    matter.leadAttorneyId
      ? db.select({
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email
        }).from(schema.users).where(eq(schema.users.id, matter.leadAttorneyId)).get()
      : null,

    // Engagement journey info
    fetchEngagementInfo(db, schema, matter.engagementJourneyId),

    // Services with catalog details
    db.select({
      matterId: schema.mattersToServices.matterId,
      catalogId: schema.mattersToServices.catalogId,
      status: schema.mattersToServices.status,
      engagedAt: schema.mattersToServices.engagedAt,
      startDate: schema.mattersToServices.startDate,
      endDate: schema.mattersToServices.endDate,
      assignedAttorneyId: schema.mattersToServices.assignedAttorneyId,
      name: schema.serviceCatalog.name,
      description: schema.serviceCatalog.description,
      type: schema.serviceCatalog.type,
      price: schema.serviceCatalog.price,
      category: schema.serviceCatalog.category
    })
      .from(schema.mattersToServices)
      .leftJoin(schema.serviceCatalog, eq(schema.mattersToServices.catalogId, schema.serviceCatalog.id))
      .where(eq(schema.mattersToServices.matterId, matterId))
      .all(),

    // Client journeys for this matter
    db.select()
      .from(schema.clientJourneys)
      .where(eq(schema.clientJourneys.matterId, matterId))
      .orderBy(desc(schema.clientJourneys.createdAt))
      .all(),

    // Payments
    db.select()
      .from(schema.payments)
      .where(eq(schema.payments.matterId, matterId))
      .orderBy(desc(schema.payments.createdAt))
      .all()
  ])

  // Enrich journeys (batch fetch instead of N+1)
  const enrichedJourneys = await enrichMatterJourneys(db, schema, journeyRows)

  // Build response preserving backward-compatible shapes
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
      google_drive_folder_id: matter.googleDriveFolderId,
      google_drive_folder_url: matter.googleDriveFolderUrl,
      google_drive_sync_status: matter.googleDriveSyncStatus,
      google_drive_sync_error: matter.googleDriveSyncError,
      google_drive_last_sync_at: matter.googleDriveLastSyncAt instanceof Date
        ? Math.floor(matter.googleDriveLastSyncAt.getTime() / 1000)
        : matter.googleDriveLastSyncAt,
      google_drive_subfolder_ids: matter.googleDriveSubfolderIds,
      import_metadata: matter.importMetadata || null,
      created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
      updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt,
      // Inline client info
      ...(clientInfo || {}),
      // Inline attorney info
      ...(attorneyInfo ? {
        lead_attorney_first_name: attorneyInfo.firstName,
        lead_attorney_last_name: attorneyInfo.lastName,
        lead_attorney_email: attorneyInfo.email
      } : {}),
      // Inline engagement journey info
      ...(engagementInfo ? {
        engagement_journey_name: engagementInfo.name
      } : {})
    },
    services,
    journeys: enrichedJourneys,
    payments
  }
})

// --- Helper functions ---

async function fetchClientInfo(db: any, schema: any, clientId: string | null) {
  if (!clientId) return null

  const { eq } = await import('drizzle-orm')

  const client = await db.select({
    firstName: schema.users.firstName,
    lastName: schema.users.lastName,
    email: schema.users.email,
    personId: schema.users.personId
  })
    .from(schema.users)
    .where(eq(schema.users.id, clientId))
    .get()

  if (!client) return null

  // Resolve the clients table ID for linking
  let clientTableId: string | null = null
  if (client.personId) {
    const clientRecord = await db.select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.personId, client.personId))
      .get()
    clientTableId = clientRecord?.id || null
  }

  return {
    client_first_name: client.firstName,
    client_last_name: client.lastName,
    client_email: client.email,
    client_table_id: clientTableId
  }
}

async function fetchEngagementInfo(db: any, schema: any, engagementJourneyId: string | null) {
  if (!engagementJourneyId) return null

  const { eq } = await import('drizzle-orm')

  const clientJourney = await db.select()
    .from(schema.clientJourneys)
    .where(eq(schema.clientJourneys.id, engagementJourneyId))
    .get()

  if (!clientJourney?.journeyId) return null

  const journey = await db.select({ name: schema.journeys.name })
    .from(schema.journeys)
    .where(eq(schema.journeys.id, clientJourney.journeyId))
    .get()

  return journey ? { name: journey.name } : null
}

/**
 * Batch-enrich matter journeys with related data (avoids N+1)
 */
async function enrichMatterJourneys(db: any, schema: any, journeys: any[]) {
  if (journeys.length === 0) return []

  const { inArray, eq } = await import('drizzle-orm')

  // Collect all IDs we need
  const journeyIds = [...new Set(journeys.map(j => j.journeyId).filter(Boolean))]
  const stepIds = [...new Set(journeys.filter(j => j.currentStepId).map(j => j.currentStepId!))]
  const catalogIds = [...new Set(journeys.filter(j => j.catalogId).map(j => j.catalogId!))]
  const clientIds = [...new Set(journeys.map(j => j.clientId))]

  // Batch fetch all related data in parallel
  const [journeyInfos, stepInfos, catalogInfos, clientInfos] = await Promise.all([
    journeyIds.length > 0
      ? db.select({
          id: schema.journeys.id,
          name: schema.journeys.name,
          description: schema.journeys.description,
          estimatedDurationDays: schema.journeys.estimatedDurationDays
        }).from(schema.journeys).where(inArray(schema.journeys.id, journeyIds)).all()
      : [],

    stepIds.length > 0
      ? db.select({
          id: schema.journeySteps.id,
          name: schema.journeySteps.name,
          stepType: schema.journeySteps.stepType
        }).from(schema.journeySteps).where(inArray(schema.journeySteps.id, stepIds)).all()
      : [],

    catalogIds.length > 0
      ? db.select({
          id: schema.serviceCatalog.id,
          name: schema.serviceCatalog.name,
          category: schema.serviceCatalog.category
        }).from(schema.serviceCatalog).where(inArray(schema.serviceCatalog.id, catalogIds)).all()
      : [],

    clientIds.length > 0
      ? db.select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email
        }).from(schema.users).where(inArray(schema.users.id, clientIds)).all()
      : []
  ])

  // Build lookup maps
  const journeyMap = new Map(journeyInfos.map((j: any) => [j.id, j]))
  const stepMap = new Map(stepInfos.map((s: any) => [s.id, s]))
  const catalogMap = new Map(catalogInfos.map((c: any) => [c.id, c]))
  const clientMap = new Map(clientInfos.map((c: any) => [c.id, c]))

  return journeys.map(cj => {
    const journey = cj.journeyId ? journeyMap.get(cj.journeyId) : null
    const currentStep = cj.currentStepId ? stepMap.get(cj.currentStepId) : null
    const service = cj.catalogId ? catalogMap.get(cj.catalogId) : null
    const client = clientMap.get(cj.clientId)

    return {
      id: cj.id,
      client_id: cj.clientId,
      matter_id: cj.matterId,
      catalog_id: cj.catalogId,
      journey_id: cj.journeyId,
      current_step_id: cj.currentStepId,
      status: cj.status,
      priority: cj.priority,
      started_at: cj.startedAt instanceof Date ? cj.startedAt.getTime() : cj.startedAt,
      completed_at: cj.completedAt instanceof Date ? cj.completedAt.getTime() : cj.completedAt,
      paused_at: cj.pausedAt instanceof Date ? cj.pausedAt.getTime() : cj.pausedAt,
      created_at: cj.createdAt instanceof Date ? cj.createdAt.getTime() : cj.createdAt,
      updated_at: cj.updatedAt instanceof Date ? cj.updatedAt.getTime() : cj.updatedAt,
      journey_name: journey?.name || null,
      journey_description: journey?.description || null,
      estimated_duration_days: journey?.estimatedDurationDays || null,
      current_step_name: currentStep?.name || null,
      current_step_type: currentStep?.stepType || null,
      service_name: service?.name || null,
      service_category: service?.category || null,
      first_name: client?.firstName || null,
      last_name: client?.lastName || null,
      email: client?.email || null
    }
  })
}
