// Composite matter detail endpoint
// Combines 7 individual API calls into a single response for the matter detail page
// Replaces: /api/matters/:id, /api/matters/:id/services,
//           /api/client-journeys/matter/:id, /api/payments/matter/:id,
//           /api/trust/clients/:clientId/balance, /api/invoices?matterId=X,
//           /api/time-entries?matterId=X

export default defineEventHandler(async (event) => {
  const matterId = getRouterParam(event, 'id')

  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID is required'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, desc, inArray, and } = await import('drizzle-orm')
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
  const [clientInfo, attorneyInfo, engagementInfo, services, journeyRows, payments, outstandingInvoices, timeEntryRows] = await Promise.all([
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
      .all(),

    // Outstanding invoices (SENT, VIEWED, PARTIALLY_PAID, OVERDUE)
    fetchOutstandingInvoices(db, schema, matterId),

    // Time entries for this matter
    fetchTimeEntries(db, schema, matterId)
  ])

  // Enrich journeys (batch fetch instead of N+1)
  const enrichedJourneys = await enrichMatterJourneys(db, schema, journeyRows)

  // Fetch trust balance (needs resolved client ID from clientInfo)
  const trustBalance = await fetchTrustBalance(clientInfo?.resolvedClientId || null)

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
      ...(clientInfo ? {
        client_first_name: clientInfo.client_first_name,
        client_last_name: clientInfo.client_last_name,
        client_email: clientInfo.client_email,
        client_table_id: clientInfo.client_table_id
      } : {}),
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
    payments,
    trustBalance,
    outstandingInvoices,
    timeEntries: timeEntryRows
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
    client_table_id: clientTableId,
    // Internal: resolved client ID for trust balance lookup
    resolvedClientId: clientTableId
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
 * Fetch client trust balance using the resolved client table ID
 */
async function fetchTrustBalance(resolvedClientId: string | null): Promise<number> {
  if (!resolvedClientId) return 0

  try {
    const { getClientTrustBalances } = await import('../../../utils/trust-ledger')
    const balances = await getClientTrustBalances(resolvedClientId)
    return balances.reduce((sum, b) => sum + b.balance, 0)
  } catch {
    // Trust ledger may not have any entries for this client
    return 0
  }
}

/**
 * Fetch outstanding invoices for a matter (SENT, VIEWED, PARTIALLY_PAID, OVERDUE)
 */
async function fetchOutstandingInvoices(db: any, schema: any, matterId: string) {
  const { eq, and, desc, inArray } = await import('drizzle-orm')

  const invoices = await db.select({
    id: schema.invoices.id,
    matterId: schema.invoices.matterId,
    clientId: schema.invoices.clientId,
    invoiceNumber: schema.invoices.invoiceNumber,
    status: schema.invoices.status,
    subtotal: schema.invoices.subtotal,
    taxRate: schema.invoices.taxRate,
    taxAmount: schema.invoices.taxAmount,
    discountAmount: schema.invoices.discountAmount,
    totalAmount: schema.invoices.totalAmount,
    trustApplied: schema.invoices.trustApplied,
    directPayments: schema.invoices.directPayments,
    balanceDue: schema.invoices.balanceDue,
    issueDate: schema.invoices.issueDate,
    dueDate: schema.invoices.dueDate,
    sentAt: schema.invoices.sentAt,
    paidAt: schema.invoices.paidAt,
    notes: schema.invoices.notes,
    createdBy: schema.invoices.createdBy,
    createdAt: schema.invoices.createdAt,
    updatedAt: schema.invoices.updatedAt,
    // Client info
    clientFirstName: schema.people.firstName,
    clientLastName: schema.people.lastName,
    clientFullName: schema.people.fullName,
    clientEmail: schema.people.email,
    // Matter info
    matterTitle: schema.matters.title
  })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .innerJoin(schema.people, eq(schema.clients.personId, schema.people.id))
    .innerJoin(schema.matters, eq(schema.invoices.matterId, schema.matters.id))
    .where(and(
      eq(schema.invoices.matterId, matterId),
      inArray(schema.invoices.status, ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'])
    ))
    .orderBy(desc(schema.invoices.createdAt))
    .all()

  return invoices.map((inv: any) => ({
    ...inv,
    clientName: inv.clientFullName || `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() || 'Unknown',
    // Snake case for backward compatibility
    matter_id: inv.matterId,
    client_id: inv.clientId,
    invoice_number: inv.invoiceNumber,
    tax_rate: inv.taxRate,
    tax_amount: inv.taxAmount,
    discount_amount: inv.discountAmount,
    total_amount: inv.totalAmount,
    trust_applied: inv.trustApplied,
    direct_payments: inv.directPayments,
    balance_due: inv.balanceDue,
    issue_date: inv.issueDate instanceof Date ? inv.issueDate.getTime() : inv.issueDate,
    due_date: inv.dueDate instanceof Date ? inv.dueDate.getTime() : inv.dueDate,
    sent_at: inv.sentAt instanceof Date ? inv.sentAt.getTime() : inv.sentAt,
    paid_at: inv.paidAt instanceof Date ? inv.paidAt.getTime() : inv.paidAt,
    created_by: inv.createdBy,
    created_at: inv.createdAt instanceof Date ? inv.createdAt.getTime() : inv.createdAt,
    updated_at: inv.updatedAt instanceof Date ? inv.updatedAt.getTime() : inv.updatedAt,
    client_name: inv.clientFullName || `${inv.clientFirstName || ''} ${inv.clientLastName || ''}`.trim() || 'Unknown',
    client_email: inv.clientEmail,
    matter_title: inv.matterTitle
  }))
}

/**
 * Fetch time entries for a matter with user and matter info
 */
async function fetchTimeEntries(db: any, schema: any, matterId: string) {
  const { eq, desc } = await import('drizzle-orm')

  const entries = await db.select({
    id: schema.timeEntries.id,
    userId: schema.timeEntries.userId,
    matterId: schema.timeEntries.matterId,
    hours: schema.timeEntries.hours,
    description: schema.timeEntries.description,
    workDate: schema.timeEntries.workDate,
    isBillable: schema.timeEntries.isBillable,
    hourlyRate: schema.timeEntries.hourlyRate,
    amount: schema.timeEntries.amount,
    status: schema.timeEntries.status,
    invoiceId: schema.timeEntries.invoiceId,
    invoiceLineItemId: schema.timeEntries.invoiceLineItemId,
    approvedBy: schema.timeEntries.approvedBy,
    approvedAt: schema.timeEntries.approvedAt,
    createdAt: schema.timeEntries.createdAt,
    updatedAt: schema.timeEntries.updatedAt,
    // User info
    userFirstName: schema.users.firstName,
    userLastName: schema.users.lastName,
    // Matter info
    matterTitle: schema.matters.title
  })
    .from(schema.timeEntries)
    .leftJoin(schema.users, eq(schema.timeEntries.userId, schema.users.id))
    .leftJoin(schema.matters, eq(schema.timeEntries.matterId, schema.matters.id))
    .where(eq(schema.timeEntries.matterId, matterId))
    .orderBy(desc(schema.timeEntries.workDate), desc(schema.timeEntries.createdAt))
    .all()

  return entries.map((entry: any) => ({
    id: entry.id,
    userId: entry.userId,
    userName: [entry.userFirstName, entry.userLastName].filter(Boolean).join(' ') || 'Unknown',
    matterId: entry.matterId,
    matterTitle: entry.matterTitle || 'Unknown Matter',
    hours: entry.hours,
    description: entry.description,
    workDate: entry.workDate,
    isBillable: entry.isBillable,
    hourlyRate: entry.hourlyRate,
    amount: entry.amount,
    status: entry.status,
    invoiceId: entry.invoiceId,
    invoiceLineItemId: entry.invoiceLineItemId,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  }))
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
